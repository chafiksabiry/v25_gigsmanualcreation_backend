"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseTwilioNumber = exports.purchaseNumber = exports.searchTwilioNumbers = exports.searchNumbers = exports.checkGigNumber = void 0;
const phoneNumberService = __importStar(require("../services/phoneNumberService"));
// Check if a gig has a phone number
const checkGigNumber = async (req, res) => {
    try {
        const { gigId } = req.params;
        if (!gigId) {
            res.status(400).json({
                success: false,
                error: 'Gig ID is required'
            });
            return;
        }
        const result = await phoneNumberService.checkGigNumber(gigId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error checking gig number:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check gig number'
        });
    }
};
exports.checkGigNumber = checkGigNumber;
// Search for available phone numbers (Telnyx)
const searchNumbers = async (req, res) => {
    try {
        const { countryCode } = req.query;
        if (!countryCode) {
            res.status(400).json({
                success: false,
                error: 'Country code is required'
            });
            return;
        }
        const numbers = await phoneNumberService.searchTelnyxNumbers(countryCode);
        res.status(200).json(numbers);
    }
    catch (error) {
        console.error('Error searching Telnyx numbers:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search phone numbers'
        });
    }
};
exports.searchNumbers = searchNumbers;
// Search for available phone numbers (Twilio)
const searchTwilioNumbers = async (req, res) => {
    try {
        const { countryCode } = req.query;
        if (!countryCode) {
            res.status(400).json({
                success: false,
                error: 'Country code is required'
            });
            return;
        }
        const numbers = await phoneNumberService.searchTwilioNumbers(countryCode);
        res.status(200).json(numbers);
    }
    catch (error) {
        console.error('Error searching Twilio numbers:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search phone numbers'
        });
    }
};
exports.searchTwilioNumbers = searchTwilioNumbers;
// Purchase a phone number (Telnyx)
const purchaseNumber = async (req, res) => {
    try {
        const { phoneNumber, gigId, companyId, requirementGroupId } = req.body;
        if (!phoneNumber || !gigId || !companyId) {
            res.status(400).json({
                success: false,
                error: 'Phone number, gig ID, and company ID are required'
            });
            return;
        }
        const result = await phoneNumberService.purchaseTelnyxNumber({
            phoneNumber,
            gigId,
            companyId,
            requirementGroupId
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error purchasing Telnyx number:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to purchase phone number'
        });
    }
};
exports.purchaseNumber = purchaseNumber;
// Purchase a phone number (Twilio)
const purchaseTwilioNumber = async (req, res) => {
    try {
        const { phoneNumber, gigId, companyId } = req.body;
        if (!phoneNumber || !gigId || !companyId) {
            res.status(400).json({
                success: false,
                error: 'Phone number, gig ID, and company ID are required'
            });
            return;
        }
        const result = await phoneNumberService.purchaseTwilioNumber({
            phoneNumber,
            gigId,
            companyId
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error purchasing Twilio number:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to purchase phone number'
        });
    }
};
exports.purchaseTwilioNumber = purchaseTwilioNumber;
