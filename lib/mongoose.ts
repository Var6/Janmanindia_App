import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

// Register every model on every connect so populate() across schemas works
// after a Turbopack hot-reload. Importing for the side-effect of model registration.
async function registerAllModels() {
  await Promise.all([
    import("@/models/Activity"),
    import("@/models/Appointment"),
    import("@/models/Asset"),
    import("@/models/CarePlan"),
    import("@/models/Case"),
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
    import("@/models/Project"),
    import("@/models/SosAlert"),
    import("@/models/TrainingMaterial"),
    import("@/models/TrainingSession"),
    import("@/models/User"),
    import("@/models/VoiceMessage"),
  ]);
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    await registerAllModels();
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is not set");

    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then(async (m) => { await registerAllModels(); return m; });
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
