import express from 'express';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://tamilorganics.netlify.app/umafoods.netlify.app/index.html',
      'http://localhost:5500',
      'http://localhost:5501',
      'http://localhost:5502',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://127.0.0.1:5502',
    ];
    
    if (origin.includes('.netlify.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ Blocked by CORS:', origin);
      callback(null, true);
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
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

// Brevo SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Uma Foods Backend API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    emailService: 'Brevo SMTP',
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

    // Email configuration - Applicant's email shows as sender!
    const mailOptions = {
      from: `"${firstName} ${lastName}" <${email}>`, // THIS SHOWS APPLICANT'S EMAIL!
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `🎯 Job Application: ${category} - ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-wrapper {
              max-width: 650px;
              margin: 20px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .applicant-header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              padding: 40px 30px;
              text-align: center;
              color: white;
            }
            .applicant-name { 
              font-size: 36px; 
              font-weight: 800;
              margin: 0 0 15px 0;
              letter-spacing: 1px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            .applicant-email {
              font-size: 20px;
              font-weight: 600;
              background: rgba(255,255,255,0.25);
              padding: 12px 25px;
              border-radius: 25px;
              display: inline-block;
              margin: 10px 0;
            }
            .position-badge {
              font-size: 18px;
              font-weight: 600;
              background: rgba(255,255,255,0.2);
              padding: 10px 20px;
              border-radius: 20px;
              display: inline-block;
              margin-top: 15px;
            }
            .content-area { 
              padding: 35px 30px;
              background: white;
            }
            .action-alert {
              background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
              color: white;
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              margin-bottom: 30px;
              font-size: 16px;
              font-weight: 600;
            }
            .quick-contact {
              display: flex;
              gap: 15px;
              justify-content: center;
              margin: 25px 0;
            }
            .contact-btn {
              flex: 1;
              padding: 15px 20px;
              text-align: center;
              border-radius: 10px;
              text-decoration: none;
              font-weight: 700;
              font-size: 15px;
              transition: transform 0.2s;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .contact-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .btn-email {
              background: #667eea;
              color: white;
            }
            .btn-phone {
              background: #28a745;
              color: white;
            }
            .info-section {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 700;
              color: #555;
              width: 180px;
              font-size: 15px;
            }
            .info-value {
              color: #333;
              font-size: 15px;
              font-weight: 500;
            }
            .info-value a {
              color: #667eea;
              text-decoration: none;
              font-weight: 700;
            }
            .resume-box {
              background: #fff3cd;
              border-left: 5px solid #ffc107;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
            }
            .footer-note {
              background: #e8f4f8;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-top: 25px;
              border: 2px dashed #667eea;
            }
            .footer-text {
              text-align: center;
              padding: 20px;
              color: #999;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <!-- Applicant Header -->
            <div class="applicant-header">
              <div class="applicant-name">📋 ${firstName} ${lastName}</div>
              <div class="applicant-email">✉️ ${email}</div>
              <div class="position-badge">💼 Applied for: ${category}</div>
            </div>
            
            <!-- Content Area -->
            <div class="content-area">
              <!-- Action Alert -->
              <div class="action-alert">
                ⚡ Click "REPLY" button to respond directly to ${firstName}
              </div>
              
              <!-- Quick Contact Buttons -->
              <div class="quick-contact">
                <a href="mailto:${email}" class="contact-btn btn-email">
                  📧 Email ${firstName}
                </a>
                <a href="tel:${phone}" class="contact-btn btn-phone">
                  📱 Call Now
                </a>
              </div>
              
              <!-- Applicant Information -->
              <div class="info-section">
                <div class="info-row">
                  <div class="info-label">👤 Full Name</div>
                  <div class="info-value"><strong>${firstName} ${lastName}</strong></div>
                </div>
                <div class="info-row">
                  <div class="info-label">📧 Email Address</div>
                  <div class="info-value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="info-row">
                  <div class="info-label">📱 Phone Number</div>
                  <div class="info-value"><a href="tel:${phone}">${phone}</a></div>
                </div>
                <div class="info-row">
                  <div class="info-label">💼 Position</div>
                  <div class="info-value"><strong>${category}</strong></div>
                </div>
                <div class="info-row">
                  <div class="info-label">🕐 Applied On</div>
                  <div class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
                </div>
              </div>
              
              <!-- Resume Info -->
              <div class="resume-box">
                <strong>📎 Resume Attached:</strong><br>
                <span style="font-size: 15px;">
                  ${resume.originalname} (${(resume.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              
              <!-- Footer Note -->
              <div class="footer-note">
                <strong style="color: #667eea; font-size: 16px;">💡 How to Reply:</strong><br>
                <span style="color: #555; margin-top: 10px; display: block;">
                  Simply click the "Reply" button in your email client.<br>
                  Your response will go directly to <strong>${email}</strong>
                </span>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer-text">
              Sent via Uma Foods Career Portal<br>
              © ${new Date().getFullYear()} Uma Foods. All rights reserved.
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

    // Send email via Brevo
    console.log('📧 Sending email via Brevo SMTP...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📬 From:', `${firstName} ${lastName} <${email}>`);
    console.log('📬 To:', process.env.RECEIVER_EMAIL);
    
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
    
    if (error.response) {
      console.error('Brevo Error:', error.response);
    }
    
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

// Alternative endpoint
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
    console.log('📧 Email Service: Brevo SMTP');
    console.log('🚀 ============================================');
    console.log('');
  });
}