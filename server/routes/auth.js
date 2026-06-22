const express = require('express');
const router = express.Router();
const User = require('../models/User');

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// Send Signup OTP
router.post('/send-signup-otp', async (req, res) => {
    try {
        const { email } = req.body;
        let user = await User.findOne({ email });

        if (user && user.isVerified) {
             return res.status(400).json({ error: 'User already exists. Please login.' });
        }
        
        if (user && user.resetOtpExpiry && user.resetOtpExpiry > Date.now()) {
             return res.status(429).json({ error: 'Please wait 5 minutes before requesting another OTP.' });
        }

        if (!user) {
             user = new User({ email, isVerified: false });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        user.resetOtp = await bcrypt.hash(otp, salt);
        user.resetOtpExpiry = Date.now() + 300000; 
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL || 'wheelriot@gmail.com',
                pass: process.env.NODEMAILER_PASSWORD || 'your_app_password_here'
            }
        });

        await transporter.sendMail({
            from: '"WheelRiot Accounts" <wheelriot@gmail.com>',
            to: user.email,
            subject: 'Verify your WheelRiot Account',
            html: `<h3>Welcome to WheelRiot!</h3><p>Your 6-digit verification code is <b>${otp}</b>.</p><p>This code expires in 5 minutes.</p>`
        });

        res.json({ message: 'A 6-digit OTP has been sent to your email.' });
    } catch (err) {
        console.error('Signup OTP Error:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// Register (Verify OTP and Create Account)
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, otp } = req.body;
    
    const user = await User.findOne({ email });

    if (!user || user.isVerified || !user.resetOtp) {
        return res.status(400).json({ message: 'Invalid registration attempt or user already verified.' });
    }

    if (Date.now() > user.resetOtpExpiry) {
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetOtp);
    if (!isMatch) return res.status(400).json({ message: 'Invalid OTP code.' });

    user.fullName = fullName;
    user.passwordHash = password; 
    user.isVerified = true;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    
    await user.save();
    
    // Auto Login
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
        token, 
        user: { 
            _id: user._id, 
            email: user.email, 
            fullName: user.fullName, 
            role: user.role,
            addresses: user.addresses || []
        } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[DEBUG] Login Attempt: ${email} / ${password}`);
    
    const user = await User.findOne({ email });
    
    if (!user) {
        console.log('[DEBUG] User not found');
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.googleId && !user.passwordHash) {
        return res.status(400).json({ message: 'This account was created with Google. Please use Google Sign-In.' });
    }
    
    if (!user.isVerified && !user.googleId) {
        return res.status(400).json({ message: 'Please complete email registration with an OTP.' });
    }
    
    console.log(`[DEBUG] User Found. HASH: ${user.passwordHash}`);
    const isMatch = await user.comparePassword(password);
    console.log(`[DEBUG] Match Result: ${isMatch}`);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '7d' }
    );

    res.json({ 
        token, 
        user: { 
            _id: user._id, 
            email: user.email, 
            fullName: user.fullName, 
            role: user.role,
            addresses: user.addresses || []
        } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change Password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    
    // In a real app, userId should come from the verified token (req.user), not the body
    // For this milestone, we'll accept it from body but highly recommend middleware later.
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });
    
    user.passwordHash = newPassword; // Pre-save hook will hash this
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GOOGLE AUTH LOGIN
router.post('/google', async (req, res) => {
  try {
    const { code, token: incomingToken } = req.body;
    
    let idToken;
    if (code) {
        // Exchange Code for Tokens (Requires Secret)
        const { tokens } = await client.getToken(code);
        idToken = tokens.id_token;
    } else if (incomingToken) {
        // Implicit Flow (Direct ID Token from React)
        idToken = incomingToken;
    } else {
        return res.status(400).json({ error: 'No token or code provided' });
    }

    // 2. Verify Token
    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 3. Check User
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });

    if (user) {
        // Enforce boundary if they used email/password first
        if (user.passwordHash && !user.googleId) {
             return res.status(400).json({ error: 'Email already registered. Please login with your password.' });
        }
        
        // Link Account if exists but not linked (though they shouldn't hit this if above executes)
        if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }
    } else {
        // Create New User
        user = await User.create({
            fullName: name,
            email,
            googleId,
            isVerified: true,
            role: 'user'
        });
    }

    // 4. Generate JWT
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({ 
        token, 
        user: { 
            _id: user._id, 
            email: user.email, 
            fullName: user.fullName, 
            role: user.role,
            addresses: user.addresses || []
        } 
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(400).json({ error: 'Google Login Failed' });
  }
});

// Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'User with this email does not exist.' });
        if (user.googleId && !user.passwordHash) return res.status(400).json({ error: 'Please use Google Login to access this account.' });

        // Check if rate limited (5 minutes for resend cooldown, matching expiry)
        // Note: Can be separated to a shorter resend cooldown if requested, but setting matches 5 minutes here
        if (user.resetOtpExpiry && user.resetOtpExpiry > Date.now()) {
            return res.status(429).json({ error: 'Please wait 5 minutes before requesting another OTP.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        user.resetOtp = await bcrypt.hash(otp, salt);
        user.resetOtpExpiry = Date.now() + 300000; // 5 minutes
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL || 'wheelriot@gmail.com',
                pass: process.env.NODEMAILER_PASSWORD || 'your_app_password_here'
            }
        });

        await transporter.sendMail({
            from: '"WheelRiot Support" <wheelriot@gmail.com>',
            to: user.email,
            subject: 'Your Password Reset OTP Code',
            html: `<h3>WheelRiot Password Reset</h3><p>Your 6-digit OTP code is <b>${otp}</b>.</p><p>This code expires in 5 minutes. If you did not request this, please ignore this email.</p>`
        });

        res.json({ message: 'A 6-digit OTP has been sent to your email.' });
    } catch (err) {
        console.error('OTP Send Error:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// Verify OTP & Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.resetOtp) return res.status(400).json({ error: 'Invalid or expired OTP.' });

        if (Date.now() > user.resetOtpExpiry) {
            user.resetOtp = undefined;
            user.resetOtpExpiry = undefined;
            await user.save();
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, user.resetOtp);
        if (!isMatch) return res.status(400).json({ error: 'Invalid OTP code.' });

        user.passwordHash = newPassword; // Will trigger pre-save hook for hashing 
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        res.json({ message: 'Password has been successfully reset. You can now login.' });
    } catch (err) {
        console.error('Password Reset Error:', err);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
});

module.exports = router;
