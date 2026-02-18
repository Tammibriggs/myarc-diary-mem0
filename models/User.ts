import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: { type: String },
    email: { type: String, unique: true, required: true },
    image: { type: String },
    password: { type: String }, // Hashed password for credentials auth
    privacyPin: { type: String }, // Hashed PIN
    isOnboarded: { type: Boolean, default: false },
    currentFocus: { type: String },
    themePreference: { type: String, default: 'electric' },
    settings: {
        emailNotifications: { type: Boolean, default: true },
        dailyReminders: { type: Boolean, default: true },
        privacy: {
            enableConcealedMode: { type: Boolean, default: false },
        },
    },
    shortsCategories: { type: [String], default: [] },
}, { timestamps: true });

const User = models.User || model('User', UserSchema);

// Export the User model
export default User;
