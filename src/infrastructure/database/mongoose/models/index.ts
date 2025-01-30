import mongoose from 'mongoose';
import { GigSchema, IGig } from '../../../../domain/entities/Gig';

export const GigModel = mongoose.model<IGig>('Gig', GigSchema);