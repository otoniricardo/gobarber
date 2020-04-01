import nodemailer from 'nodemailer';
import config from '../config/mail';

class Mail {
  constructor() {
    const { host, port, secure, auth } = config;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: auth.user ? auth : null,
    });
  }

  sendMail(message) {
    return this.transporter.sendMail({
      ...config.default,
      ...message,
    });
  }
}
export default new Mail();
