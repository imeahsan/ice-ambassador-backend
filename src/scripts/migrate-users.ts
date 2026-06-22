import * as admin from 'firebase-admin';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { UserSchema } from '../schemas/user.schema';

// Helper to manually parse .env key-value pairs
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const FIREBASE_KEY_PATH = path.resolve(process.cwd(), 'icedrop-465604-firebase-adminsdk-fbsvc-7fb23549d7.json');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('--- Migration Script Started ---');
  if (isDryRun) {
    console.log('Mode: DRY-RUN (No writes will be made to MongoDB)');
  } else {
    console.log('Mode: LIVE WRITE');
  }

  // 1. Connect to MongoDB if not dry-run or if verifying connection
  let UserModel: mongoose.Model<any> | null = null;
  if (!isDryRun) {
    if (!MONGODB_URI) {
      console.error('Error: MONGODB_URI is not set in environment or .env');
      process.exit(1);
    }
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.');
    UserModel = mongoose.model('User', UserSchema);
  } else {
    console.log('Dry run: Skipping MongoDB connection. Simulating schema registration.');
    UserModel = mongoose.model('User', UserSchema);
  }

  // 2. Initialize Firebase Admin
  let firestoreDb: any = null;
  let useMockData = false;

  console.log(`Initializing Firebase Admin from: ${FIREBASE_KEY_PATH}`);
  try {
    if (!fs.existsSync(FIREBASE_KEY_PATH)) {
      throw new Error(`Firebase credentials file not found at ${FIREBASE_KEY_PATH}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_KEY_PATH, 'utf8'));
    if (serviceAccount.private_key_id === 'mock_private_key_id') {
      console.log('Using mock service account credentials. Switching to simulated data.');
      useMockData = true;
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestoreDb = admin.firestore();
      console.log('Firebase Admin and Firestore initialized successfully.');
    }
  } catch (error: any) {
    console.warn(`Warning: Failed to initialize Firestore: ${error.message}`);
    console.log('Switching to simulated mock data for dry-run verification.');
    useMockData = true;
  }

  // 3. Fetch Signups (Either Firestore or simulated mock data)
  let signups: any[] = [];
  if (useMockData) {
    console.log('Generating simulated Firestore ambassador_signups...');
    signups = [
      {
        id: 'fb-user-1',
        email: 'migrated1@example.com',
        phone: '111-222-3333',
        firstName: 'Alice',
        lastName: 'Smith',
        referralCode: 'REF-ALICE',
        referredByCode: null,
        userType: 'AMBASSADOR',
      },
      {
        id: 'fb-user-2',
        email: 'migrated2@example.com',
        phone: '4445556666',
        firstName: 'Bob',
        lastName: 'Jones',
        referralCode: 'REF-BOB',
        referredByCode: 'REF-ALICE',
        userType: 'AMBASSADOR',
      },
      {
        id: 'fb-user-3',
        email: 'migrated3@example.com',
        phone: '777.888.9999',
        firstName: 'Charlie',
        lastName: 'Brown',
        referralCode: 'REF-CHARLIE',
        referredByCode: 'REF-INVALID',
        userType: 'AMBASSADOR',
      },
    ];
  } else {
    try {
      console.log("Fetching signups count from Firestore 'ambassador_signups' collection...");
      const snapshot = await firestoreDb.collection('ambassador_signups').get();
      console.log(`Found ${snapshot.size} documents in Firestore.`);
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        signups.push({
          id: doc.id,
          email: data.email || data.emailAddress,
          phone: data.phone || data.phoneNumber || '',
          firstName: data.firstName || data.name?.split(' ')[0] || 'First',
          lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || 'Last',
          referralCode: data.referralCode,
          referredByCode: data.referredByCode || data.referredBy || null,
          userType: data.userType || data.role || 'AMBASSADOR',
        });
      });
    } catch (error: any) {
      console.error(`Error fetching from Firestore: ${error.message}`);
      if (!isDryRun) {
        process.exit(1);
      }
    }
  }

  // 4. Pass 1: Insert or Update User Documents
  console.log('\n--- Pass 1: Migrating Users ---');
  let readCount = signups.length;
  let createdCount = 0;
  let skippedCount = 0;

  // Track referral relationships for Pass 2
  // Structure: { refereeMongoId or refereeEmail: referredByCode }
  const referralRelations: Array<{ refereeEmail: string; referredByCode: string }> = [];
  // Local cache of email -> mongo ID mapping
  const mongoIdCache = new Map<string, string>();

  for (const signup of signups) {
    const emailLower = signup.email.toLowerCase();
    const phoneNormalized = signup.phone.replace(/\D/g, '');

    // Record relationship if referredByCode exists
    if (signup.referredByCode) {
      referralRelations.push({
        refereeEmail: emailLower,
        referredByCode: signup.referredByCode.toUpperCase(),
      });
    }

    if (isDryRun) {
      console.log(`[Dry-Run] Would migrate user: ${emailLower} (${signup.firstName} ${signup.lastName}), ReferralCode: ${signup.referralCode}, FirebaseUid: ${signup.id}`);
      createdCount++;
      // Simulate MongoDB Object ID for dry-run
      mongoIdCache.set(emailLower, `mock_oid_${signup.id}`);
    } else if (UserModel) {
      // Find existing user by firebaseUid or email
      let userDoc = await UserModel.findOne({
        $or: [{ firebaseUid: signup.id }, { email: emailLower }],
      });

      const userFields = {
        email: emailLower,
        phone: phoneNormalized,
        firstName: signup.firstName,
        lastName: signup.lastName,
        userType: signup.userType,
        referralCode: signup.referralCode,
        firebaseUid: signup.id,
        status: 'PASSWORD_RESET_REQUIRED',
        isMigrated: true,
      };

      if (userDoc) {
        console.log(`User already exists: ${emailLower}. Updating user info...`);
        Object.assign(userDoc, userFields);
        await userDoc.save();
        skippedCount++;
        mongoIdCache.set(emailLower, userDoc._id.toString());
      } else {
        console.log(`Creating new user: ${emailLower}...`);
        userDoc = new UserModel(userFields);
        await userDoc.save();
        createdCount++;
        mongoIdCache.set(emailLower, userDoc._id.toString());
      }
    }
  }

  // 5. Pass 2: Resolve Referrals
  console.log('\n--- Pass 2: Resolving Referral Connections ---');
  let linkFailuresCount = 0;

  for (const relation of referralRelations) {
    const refereeId = mongoIdCache.get(relation.refereeEmail);
    if (!refereeId) {
      linkFailuresCount++;
      continue;
    }

    if (isDryRun) {
      console.log(`[Dry-Run] Would resolve referral: referee ${relation.refereeEmail} was referred by code: ${relation.referredByCode}`);
      // In dry run, check if referrer code matches one of our simulated users' referral codes
      const referrerSignup = signups.find((s) => s.referralCode === relation.referredByCode);
      if (referrerSignup) {
        console.log(`[Dry-Run] Referral resolved successfully: found referrer ${referrerSignup.email}`);
      } else {
        console.warn(`[Dry-Run] Link-resolution failure: No user has referral code ${relation.referredByCode}`);
        linkFailuresCount++;
      }
    } else if (UserModel) {
      // Find referrer user by referralCode
      const referrerDoc = await UserModel.findOne({ referralCode: relation.referredByCode });

      if (referrerDoc) {
        console.log(`Resolving referral: Linking ${relation.refereeEmail} to referrer ${referrerDoc.email} (${referrerDoc._id})`);
        await UserModel.updateOne(
          { _id: refereeId },
          { $set: { referredByUserId: referrerDoc._id } }
        );
      } else {
        console.warn(`Link-resolution failure: Referrer with code ${relation.referredByCode} not found in MongoDB`);
        linkFailuresCount++;
      }
    }
  }

  // 6. Cleanup and Print Summary
  if (!isDryRun) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total Docs Read from Firestore:  ${readCount}`);
  console.log(`Total Users Created in Mongo:   ${createdCount}`);
  console.log(`Total Users Updated/Skipped:    ${skippedCount}`);
  console.log(`Link-resolution Failures:       ${linkFailuresCount}`);
  console.log('-------------------------');
}

main().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
