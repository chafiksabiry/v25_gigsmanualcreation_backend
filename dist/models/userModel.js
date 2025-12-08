"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: function () {
            return !this.linkedInId;
        }
    },
    linkedInId: {
        type: String,
        sparse: true,
        unique: true
    },
    phone: {
        type: String,
        required: function () {
            return !this.linkedInId;
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        code: String,
        expiresAt: Date,
        otp: { type: Number },
        otpExpiresAt: { type: Date },
    },
    ipHistory: [{
            ip: String,
            timestamp: {
                type: Date,
                default: Date.now
            },
            action: {
                type: String,
                enum: ['register', 'login']
            },
            locationInfo: {
                location: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'Timezone',
                    required: false
                },
                region: String,
                city: String,
                isp: String,
                postal: String,
                coordinates: String // format: "lat,lng"
            }
        }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    typeUser: {
        type: String,
        default: null,
    },
    firstTime: {
        type: Boolean,
        default: true
    }
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password)
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
exports.default = mongoose_1.default.model('User', userSchema);
