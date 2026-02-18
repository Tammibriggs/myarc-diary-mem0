import mongoose, { Schema, model, models } from 'mongoose';

const MilestoneSchema = new Schema({
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
}, { _id: true });

const ShortSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: {
        type: String,
        required: true
    },
    source: {
        type: String,
        enum: ['ai', 'user'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active'
    },
    sourceEntryId: { type: Schema.Types.ObjectId, ref: 'Entry' },
    milestones: [MilestoneSchema], // For goals only
}, { timestamps: true });

const Short = models.Short || model('Short', ShortSchema);

export default Short;
