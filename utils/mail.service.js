const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
//     auth: {
//         user: process.env.EMAIL_USER || '',
//         pass: process.env.EMAIL_PASS || '',
//     },
// });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Helper to render HBS template
 */
const renderTemplate = (templateName, context) => {
    try {
        const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
        const source = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(source);
        return template(context);
    } catch (error) {
        console.error(`Error rendering template ${templateName}:`, error);
        return null;
    }
};

/**
 * Generic function to send email using HBS template
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateName - Name of the .hbs file (without extension)
 * @param {object} context - Data object to be used in the template
 */
exports.sendEmail = async (toEmail, subject, templateName, context) => {
    try {
        const html = renderTemplate(templateName, context);

        if (!html) {
            throw new Error(`Failed to render template: ${templateName}`);
        }

        const mailOptions = {
            from: `"HRMS Support" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: subject,
            html: html
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Email (${templateName}) sent to ${toEmail}`);
        return result;
    } catch (error) {
        console.error(`Email Sending Error (${templateName}):`, error);
        return null;
    }
};
