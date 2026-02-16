import mongoose, { Schema, model, models } from 'mongoose';

const DailyArcSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    suggestedAction: { type: String },
    momentumScore: { type: Number, default: 0 },
    completedActions: [{ type: String }],
}, { timestamps: true });

const DailyArc = models.DailyArc || model('DailyArc', DailyArcSchema);

export default DailyArc;
