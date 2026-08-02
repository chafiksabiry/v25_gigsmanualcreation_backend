"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseTwilioNumber = exports.purchaseTelnyxNumber = exports.searchTwilioNumbers = exports.searchTelnyxNumbers = exports.checkGigNumber = void 0;
const axios_1 = __importDefault(require("axios"));
// Telnyx API configuration
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_API_URL = 'https://api.telnyx.com/v2';
// Twilio API configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01';
// Check if a gig has a phone number
const checkGigNumber = async (gigId) => {
    try {
        // TODO: Implement database check for gig phone number
        // For now, return a mock response
        return {
            hasNumber: false,
            message: 'No phone number assigned to this gig'
        };
    }
    catch (error) {
        console.error('Error checking gig number:', error);
        throw new Error('Failed to check gig number');
    }
};
exports.checkGigNumber = checkGigNumber;
// Search for available Telnyx phone numbers
const searchTelnyxNumbers = async (countryCode) => {
    try {
        if (!TELNYX_API_KEY) {
            console.warn('Telnyx API key not configured');
            return [];
        }
        const response = await axios_1.default.get(`${TELNYX_API_URL}/available_phone_numbers`, {
            headers: {
                'Authorization': `Bearer ${TELNYX_API_KEY}`,
                'Content-Type': 'application/json'
            },
            params: {
                'filter[country_code]': countryCode,
                'filter[features]': 'sms,voice',
                'filter[limit]': 10
            }
        });
        return response.data.data || [];
    }
    catch (error) {
        console.error('Error searching Telnyx numbers:', error.response?.data || error.message);
        throw new Error('Failed to search Telnyx phone numbers');
    }
};
exports.searchTelnyxNumbers = searchTelnyxNumbers;
// Search for available Twilio phone numbers
const searchTwilioNumbers = async (countryCode) => {
    try {
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            console.warn('Twilio credentials not configured');
            return [];
        }
        const response = await axios_1.default.get(`${TWILIO_API_URL}/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${countryCode}/Local.json`, {
            auth: {
                username: TWILIO_ACCOUNT_SID,
                password: TWILIO_AUTH_TOKEN
            },
            params: {
                VoiceEnabled: true,
                SmsEnabled: true,
                Limit: 10
            }
        });
        return response.data.available_phone_numbers || [];
    }
    catch (error) {
        console.error('Error searching Twilio numbers:', error.response?.data || error.message);
        throw new Error('Failed to search Twilio phone numbers');
    }
};
exports.searchTwilioNumbers = searchTwilioNumbers;
// Purchase a Telnyx phone number
const purchaseTelnyxNumber = async (params) => {
    try {
        const { phoneNumber, gigId, companyId, requirementGroupId } = params;
        if (!TELNYX_API_KEY) {
            throw new Error('Telnyx API key not configured');
        }
        const response = await axios_1.default.post(`${TELNYX_API_URL}/number_orders`, {
            phone_numbers: [
                {
                    phone_number: phoneNumber
                }
            ],
            ...(requirementGroupId && {
                regulatory_requirements: {
                    requirement_group_id: requirementGroupId
                }
            })
        }, {
            headers: {
                'Authorization': `Bearer ${TELNYX_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        // TODO: Save phone number to database with gigId and companyId
        return {
            phoneNumber,
            status: 'purchased',
            provider: 'telnyx',
            features: {
                voice: true,
                sms: true,
                mms: true
            }
        };
    }
    catch (error) {
        console.error('Error purchasing Telnyx number:', error.response?.data || error.message);
        throw new Error('Failed to purchase Telnyx phone number');
    }
};
exports.purchaseTelnyxNumber = purchaseTelnyxNumber;
// Purchase a Twilio phone number
const purchaseTwilioNumber = async (params) => {
    try {
        const { phoneNumber, gigId, companyId } = params;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
            throw new Error('Twilio credentials not configured');
        }
        const response = await axios_1.default.post(`${TWILIO_API_URL}/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, new URLSearchParams({
            PhoneNumber: phoneNumber,
            VoiceEnabled: 'true',
            SmsEnabled: 'true'
        }), {
            auth: {
                username: TWILIO_ACCOUNT_SID,
                password: TWILIO_AUTH_TOKEN
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        // TODO: Save phone number to database with gigId and companyId
        return {
            phoneNumber,
            status: 'purchased',
            provider: 'twilio',
            features: {
                voice: true,
                sms: true,
                mms: true
            }
        };
    }
    catch (error) {
        console.error('Error purchasing Twilio number:', error.response?.data || error.message);
        throw new Error('Failed to purchase Twilio phone number');
    }
};
exports.purchaseTwilioNumber = purchaseTwilioNumber;
