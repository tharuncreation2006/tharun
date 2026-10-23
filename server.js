require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const EMAIL_USER = process.env.EMAIL_USER || 'tharunparthiban2006@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS; // Gmail App Password (16 characters)

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(__dirname));

// Configure Nodemailer Transporter
let transporter;

if (EMAIL_PASS) {
  // Production Gmail Transporter with App Password
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  console.log(`[Node Mail] Configured Gmail SMTP for ${EMAIL_USER}`);
} else {
  // Fallback Ethereal Test Account if App Password is not yet set in .env
  console.log('[Node Mail] EMAIL_PASS not detected in .env. Initializing Ethereal test transporter for instant zero-config testing...');
  nodemailer.createTestAccount((err, account) => {
    if (err) {
      console.warn('[Node Mail] Could not create Ethereal test account:', err);
      // Mock transporter for safe offline development
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n--- [MOCK NODE MAIL DISPATCH] ---');
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log('Body Preview:', mailOptions.text ? mailOptions.text.substring(0, 150) + '...' : 'HTML Content');
          return { messageId: 'mock-' + Date.now() };
        }
      };
    } else {
      transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass
        }
      });
      console.log(`[Node Mail] Test Transporter active via Ethereal (${account.user}). Email preview URLs will be logged to console.`);
    }
  });
}

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'Tharun Portfolio Node Mail Server',
    recipient: EMAIL_USER,
    hasAppPassword: Boolean(EMAIL_PASS)
  });
});

// Main Contact & Auto-Reply Endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields.'
      });
    }

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // 1. Email to Tharun (Inbound Message Notification)
    const adminMailOptions = {
      from: `"Tharun Portfolio Bot" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      replyTo: email,
      subject: `🚀 New Portfolio Message from ${name}`,
      text: `New Portfolio Contact Submission\n\nName: ${name}\nEmail: ${email}\nDate: ${timestamp}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #030712; color: #f3f4f6; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
          <div style="border-bottom: 2px solid #00f0ff; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #00f0ff; margin: 0; font-size: 24px; letter-spacing: 1px;">&lt;THARUN.P/&gt; PORTFOLIO TRANSMISSION</h2>
            <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 13px;">Inbound transmission received from website contact form</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #00f0ff; font-weight: bold; width: 90px;">SENDER:</td>
              <td style="padding: 8px 0; color: #ffffff;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #00f0ff; font-weight: bold;">EMAIL:</td>
              <td style="padding: 8px 0; color: #ffffff;"><a href="mailto:${email}" style="color: #00f0ff; text-decoration: underline;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #00f0ff; font-weight: bold;">TIME:</td>
              <td style="padding: 8px 0; color: #9ca3af;">${timestamp}</td>
            </tr>
          </table>

          <div style="background-color: #0b1329; border-left: 4px solid #ff0055; border-radius: 6px; padding: 18px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #ff0055; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">MESSAGE CONTENT:</h4>
            <p style="margin: 0; color: #e5e7eb; line-height: 1.6; white-space: pre-wrap; font-size: 15px;">${message}</p>
          </div>

          <div style="margin-top: 25px; text-align: center;">
            <a href="mailto:${email}?subject=Re:%20Portfolio%20Inquiry%20-%20Tharun%20P" style="background: linear-gradient(135deg, #00f0ff, #8a2be2); color: #000000; font-weight: bold; text-decoration: none; padding: 12px 25px; border-radius: 6px; display: inline-block; font-size: 14px;">
              REPLY DIRECTLY TO ${name.toUpperCase()}
            </a>
          </div>
        </div>
      `
    };

    // 2. Thanking Email sent back to the visitor
    const visitorThankingMailOptions = {
      from: `"Tharun P" <${EMAIL_USER}>`,
      to: email,
      subject: `Thank you for reaching out, ${name}! - Tharun P Portfolio`,
      text: `Hi ${name},\n\nThank you for reaching out through my portfolio website! I have received your message:\n\n"${message}"\n\nI personally review each message and will reply to you within 24 hours.\n\nWarm regards,\nTharun P\nAI & ML Engineer • Creative Full-Stack Developer\nChennai, India\nLinkedIn: https://www.linkedin.com/in/tharun-p-dce-chennai-901892342`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #020617; color: #f8fafc; padding: 35px 25px; border-radius: 14px; max-width: 620px; margin: 0 auto; border: 1px solid rgba(0, 240, 255, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Cyber Header -->
          <div style="text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 25px;">
            <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; background: rgba(0, 255, 135, 0.15); border: 1px solid #00ff87; color: #00ff87; font-size: 11px; letter-spacing: 1.5px; font-weight: bold; margin-bottom: 12px;">
              ● TRANSMISSION RECEIVED &bull; ACKNOWLEDGMENT
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">
              Thank You for Reaching Out!
            </h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; font-family: monospace;">
              Personal transmission receipt from Tharun P
            </p>
          </div>

          <!-- Body Greeting -->
          <div style="font-size: 15px; line-height: 1.7; color: #cbd5e1;">
            <p style="font-size: 17px; font-weight: bold; color: #ffffff; margin-top: 0;">Hi ${name},</p>
            <p>
              Thank you so much for getting in touch with me through my portfolio website. Your inquiry has been received directly in my inbox.
            </p>

            <!-- Quoted Message Box -->
            <div style="background-color: #0b1329; border-left: 4px solid #00f0ff; border-radius: 8px; padding: 15px 18px; margin: 20px 0;">
              <div style="color: #00f0ff; font-size: 12px; font-family: monospace; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">
                Your Message Reference:
              </div>
              <div style="color: #e2e8f0; font-style: italic; font-size: 14px; line-height: 1.5;">
                "${message.length > 250 ? message.substring(0, 250) + '...' : message}"
              </div>
            </div>

            <p>
              I personally review every inquiry regarding <strong>Machine Learning &amp; AI development</strong>, <strong>Full-Stack engineering</strong>, and <strong>creative technology collaborations</strong>. You can expect a response within <strong>24 hours</strong>.
            </p>

            <p>
              If your requirement is time-sensitive, feel free to also connect directly with me on LinkedIn or explore my code on GitHub:
            </p>

            <!-- Quick Links Buttons -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://www.linkedin.com/in/tharun-p-dce-chennai-901892342?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" style="background-color: #0077b5; color: #ffffff; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 6px; display: inline-block; font-size: 13px; margin: 0 5px 10px;">
                Connect on LinkedIn &rarr;
              </a>
              <a href="https://github.com" target="_blank" style="background-color: #24292e; color: #ffffff; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 6px; display: inline-block; font-size: 13px; margin: 0 5px 10px; border: 1px solid #444;">
                Explore GitHub Repos
              </a>
            </div>

            <!-- Signoff -->
            <div style="border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 18px; margin-top: 25px;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px; font-family: monospace;">Warm regards,</p>
              <h3 style="margin: 4px 0 2px 0; color: #ffffff; font-size: 18px; font-weight: 700;">Tharun P</h3>
              <p style="margin: 0; color: #00f0ff; font-size: 13px; font-weight: 500;">AI &amp; ML Engineer &bull; Creative Full-Stack Developer</p>
              <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">Chennai, Tamil Nadu, India</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 15px; margin-top: 25px; text-align: center; font-size: 11px; color: #64748b;">
            This confirmation email was automatically sent from the official portfolio of Tharun P.
          </div>
        </div>
      `
    };

    // Dispatch both emails concurrently using Nodemailer
    if (transporter && typeof transporter.sendMail === 'function') {
      const [adminResult, visitorResult] = await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(visitorThankingMailOptions)
      ]);

      console.log(`[Node Mail] Sent notification to ${EMAIL_USER} (Message ID: ${adminResult.messageId})`);
      console.log(`[Node Mail] Sent thanking email to ${email} (Message ID: ${visitorResult.messageId})`);

      // If Ethereal test account is used, log preview URLs
      const adminPreview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(adminResult) : false;
      const visitorPreview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(visitorResult) : false;
      if (visitorPreview) {
        console.log(`[Node Mail Test Preview URL for Visitor Thanking Mail]: ${visitorPreview}`);
      }

      return res.json({
        success: true,
        message: 'Message delivered to Tharun & thanking mail sent back to your inbox!',
        visitorPreviewUrl: visitorPreview || null
      });
    } else {
      return res.json({
        success: true,
        message: 'Message received and processed.'
      });
    }

  } catch (err) {
    console.error('[Node Mail Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch email via Node Mail.',
      error: err.message
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Tharun Portfolio Node Mail Server running on port ${PORT}`);
  console.log(`🌐 Web URL: http://localhost:${PORT}`);
  console.log(`📬 Recipient: ${EMAIL_USER}`);
  console.log(`🔑 Gmail App Password: ${EMAIL_PASS ? 'Configured ✅' : 'Not Set in .env (Using Test/Mock Transporter) ℹ️'}`);
  console.log(`======================================================\n`);
});
