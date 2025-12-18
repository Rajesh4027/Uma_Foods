import express from 'express';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS configuration - PRODUCTION READY
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://tamilorganics.netlify.app/umafoods.netlify.app/index.html',
      'http://localhost:5500',
      'http://localhost:5501',
      'http://localhost:5502',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://127.0.0.1:5502',
      // Add your Netlify URL here when you deploy
    ];
    
    // Allow all Netlify preview URLs
    if (origin.includes('.netlify.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ Blocked by CORS:', origin);
      callback(null, true); // Allow for now, change to false in strict production
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads (max 3MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'));
    }
  }
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Root endpoint - Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Uma Foods Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      sendEmail: 'POST /send-email'
    }
  });
});

// API health check
app.get('/api', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Uma Foods Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Main email sending endpoint
app.post('/send-email', upload.single('resume'), async (req, res) => {
  const startTime = Date.now();
  console.log('📨 [' + new Date().toISOString() + '] New request to /send-email');
  console.log('📍 Origin:', req.headers.origin || 'No origin');
  console.log('📦 Body:', req.body);
  console.log('📎 File:', req.file ? req.file.originalname : 'No file');

  try {
    const { firstName, lastName, email, phone, category } = req.body;
    const resume = req.file;

    // Validation
    if (!firstName || !lastName || !email || !phone || !category) {
      console.log('❌ Validation failed: Missing fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required. Please fill in all fields.'
      });
    }

    if (!resume) {
      console.log('❌ Validation failed: No resume file');
      return res.status(400).json({
        success: false,
        message: 'Resume file is required. Please upload your resume.'
      });
    }

    console.log('✅ Validation passed, preparing email...');

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: `🎯 New Job Application: ${category} - ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content h2 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-top: 0; }
            .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .info-table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f0; }
            .info-table td:first-child { font-weight: bold; color: #555; width: 40%; }
            .info-table td:last-child { color: #333; }
            .highlight { background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
            .badge { display: inline-block; padding: 5px 15px; background: #667eea; color: white; border-radius: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Job Application</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Uma Foods Career Portal</p>
            </div>
            
            <div class="content">
              <h2>Applicant Information</h2>
              
              <table class="info-table">
                <tr>
                  <td>👤 Full Name</td>
                  <td><strong>${firstName} ${lastName}</strong></td>
                </tr>
                <tr>
                  <td>📧 Email Address</td>
                  <td><a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td>📱 Phone Number</td>
                  <td><a href="tel:${phone}" style="color: #667eea; text-decoration: none;">${phone}</a></td>
                </tr>
                <tr>
                  <td>💼 Position Applied</td>
                  <td><span class="badge">${category}</span></td>
                </tr>
                <tr>
                  <td>📎 Resume File</td>
                  <td>${resume.originalname} <br><small style="color: #999;">(${(resume.size / 1024).toFixed(2)} KB)</small></td>
                </tr>
                <tr>
                  <td>🕐 Submitted On</td>
                  <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                </tr>
              </table>
              
              <div class="highlight">
                <strong>📎 Action Required:</strong> The applicant's resume is attached to this email. Please review and respond accordingly.
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #666;">
                  <strong>Next Steps:</strong><br>
                  Review the attached resume and contact the candidate for further evaluation.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>This email was automatically generated from the Uma Foods Career Application Form</p>
              <p>© ${new Date().getFullYear()} Uma Foods. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: resume.originalname,
          content: resume.buffer,
        },
      ],
    };

    // Send email
    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Processing time: ${processingTime}ms`);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully! We will contact you soon.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error sending email:', error);
    console.log(`⏱️ Failed after: ${processingTime}ms`);
    
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.'
      });
    }
    
    if (error.message.includes('File too large')) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 3MB limit. Please upload a smaller file.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send application. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Alternative endpoint for /api/send-email
app.post('/api/send-email', upload.single('resume'), async (req, res) => {
  console.log('🔄 Request to /api/send-email, forwarding to main handler...');
  req.url = '/send-email';
  return app._router.handle(req, res);
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.url}`,
    availableEndpoints: {
      'GET /': 'Health check',
      'POST /send-email': 'Submit job application',
      'POST /api/send-email': 'Submit job application (alternative)'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 3MB limit. Please upload a smaller file.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// For Vercel serverless function
export default app;

// For local development
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('🚀 Uma Foods Backend Server Started');
    console.log('🚀 ============================================');
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/`);
    console.log(`📧 Send Email API: POST http://localhost:${PORT}/send-email`);
    console.log('🚀 ============================================');
    console.log('');
  });
}