import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; modelsRegistered: boolean };
}

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null, modelsRegistered: false };
}

// Register every model once per process so populate() across schemas works.
// After the first registration the modules are cached by Node and `mongoose.models`
// retains the schemas, so subsequent connectDB() calls skip this entirely.
async function registerAllModelsOnce() {
  if (cached.modelsRegistered) return;
  await Promise.all([
    import("@/models/Activity"),
    import("@/models/Appointment"),
    import("@/models/Asset"),
    import("@/models/Attendance"),
    import("@/models/CarePlan"),
    import("@/models/Case"),
    import("@/models/CaseReview"),
    import("@/models/Conversation"),
    import("@/models/DailyReport"),
    import("@/models/DistrictHelpline"),
    import("@/models/EodReport"),
    import("@/models/Expense"),
    import("@/models/Grievance"),
    import("@/models/HeadLawyer"),
    import("@/models/Icp"),
    import("@/models/LogisticsTicket"),
    import("@/models/Message"),
    import("@/models/Notification"),
    import("@/models/Project"),
    import("@/models/SosAlert"),
    import("@/models/TaskAssignment"),
    import("@/models/TrainingMaterial"),
    import("@/models/TrainingSession"),
    import("@/models/User"),
    import("@/models/VoiceMessage"),
  ]);
  cached.modelsRegistered = true;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is not set");

    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        // Fail fast on Vercel cold starts when DB is unreachable rather than
        // hanging the request for the default 30s.
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        // Keep connections warm between invocations on the same lambda.
        maxPoolSize: 10,
      })
      .then(async (m) => { await registerAllModelsOnce(); return m; });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/** Returns false when DB is unreachable — pages can show empty state instead of crashing. */
export async function tryConnectDB(): Promise<boolean> {
  try {
    await connectDB();
    return true;
  } catch {
    return false;
  }
}
