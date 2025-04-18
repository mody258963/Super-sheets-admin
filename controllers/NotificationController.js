const { Op } = require('sequelize');
const Subscription = require('../models/subscriptionModel');
const Coach = require('../models/coachModel');
const Plan = require('../models/planModel');

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private/Admin
const getNotifications = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get expiring subscriptions (within next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const expiringSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [today, nextWeek]
        }
      },
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      order: [['end_date', 'ASC']],
      limit,
      offset
    });
    
    // Count total expiring subscriptions
    const totalExpiring = await Subscription.count({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [today, nextWeek]
        }
      }
    });
    
    // Get recently expired subscriptions (within last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    const expiredSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [lastWeek, today]
        }
      },
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      order: [['end_date', 'DESC']],
      limit,
      offset
    });
    
    // Count total expired subscriptions
    const totalExpired = await Subscription.count({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [lastWeek, today]
        }
      }
    });
    
    // Get pending payments
    const pendingPayments = await Subscription.findAll({
      where: {
        payment_status: 'pending'
      },
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    
    // Count total pending payments
    const totalPending = await Subscription.count({
      where: {
        payment_status: 'pending'
      }
    });
    
    res.json({
      expiringSubscriptions: {
        total: totalExpiring,
        page,
        pages: Math.ceil(totalExpiring / limit),
        data: expiringSubscriptions
      },
      expiredSubscriptions: {
        total: totalExpired,
        page,
        pages: Math.ceil(totalExpired / limit),
        data: expiredSubscriptions
      },
      pendingPayments: {
        total: totalPending,
        page,
        pages: Math.ceil(totalPending / limit),
        data: pendingPayments
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send notification to coach about expiring subscription
// @route   POST /api/notifications/expiring/:id
// @access  Private/Admin
const sendExpiringNotification = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price', 'duration_days']
        }
      ]
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Here you would integrate with your email/SMS service to send the notification
    // For example, using nodemailer for email or Twilio for SMS
    
    // For now, we'll just simulate the notification
    const notificationData = {
      to: subscription.Coach.email,
      subject: 'Your subscription is expiring soon',
      message: `Dear ${subscription.Coach.name},\n\nYour subscription to the ${subscription.Plan.name} plan is expiring on ${new Date(subscription.end_date).toLocaleDateString()}. Please renew your subscription to continue enjoying our services.\n\nThank you,\nSuper Sheets Team`
    };
    
    // Mark notification as sent in the subscription
    subscription.notification_sent = true;
    subscription.last_notification_date = new Date();
    await subscription.save();
    
    res.json({
      message: 'Notification sent successfully',
      notificationData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send notification to coach about payment reminder
// @route   POST /api/notifications/payment/:id
// @access  Private/Admin
const sendPaymentReminder = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ]
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    if (subscription.payment_status !== 'pending') {
      return res.status(400).json({ message: 'This subscription does not have a pending payment' });
    }
    
    // Here you would integrate with your email/SMS service to send the payment reminder
    
    // For now, we'll just simulate the notification
    const notificationData = {
      to: subscription.Coach.email,
      subject: 'Payment Reminder',
      message: `Dear ${subscription.Coach.name},\n\nThis is a reminder that your payment of $${subscription.Plan.price} for the ${subscription.Plan.name} plan is pending. Please complete your payment to continue enjoying our services.\n\nThank you,\nSuper Sheets Team`
    };
    
    // Mark payment reminder as sent in the subscription
    subscription.payment_reminder_sent = true;
    subscription.last_payment_reminder_date = new Date();
    await subscription.save();
    
    res.json({
      message: 'Payment reminder sent successfully',
      notificationData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send bulk notifications to coaches with expiring subscriptions
// @route   POST /api/notifications/bulk/expiring
// @access  Private/Admin
const sendBulkExpiringNotifications = async (req, res) => {
  try {
    const { days } = req.body;
    
    if (!days) {
      return res.status(400).json({ message: 'Please provide the number of days' });
    }
    
    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));
    
    // Find subscriptions expiring within the specified days
    const expiringSubscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [today, futureDate]
        },
        notification_sent: false
      },
      include: [
        {
          model: Coach,
          attributes: ['name', 'email', 'phone']
        },
        {
          model: Plan,
          attributes: ['name', 'price']
        }
      ]
    });
    
    if (expiringSubscriptions.length === 0) {
      return res.status(404).json({ message: 'No expiring subscriptions found that need notifications' });
    }
    
    // Here you would integrate with your email/SMS service to send bulk notifications
    
    // For now, we'll just simulate the notifications
    const notificationsSent = [];
    
    for (const subscription of expiringSubscriptions) {
      // Prepare notification data
      const notificationData = {
        to: subscription.Coach.email,
        subject: 'Your subscription is expiring soon',
        message: `Dear ${subscription.Coach.name},\n\nYour subscription to the ${subscription.Plan.name} plan is expiring on ${new Date(subscription.end_date).toLocaleDateString()}. Please renew your subscription to continue enjoying our services.\n\nThank you,\nSuper Sheets Team`
      };
      
      // Mark notification as sent in the subscription
      subscription.notification_sent = true;
      subscription.last_notification_date = new Date();
      await subscription.save();
      
      notificationsSent.push({
        subscription_id: subscription.subscription_id,
        coach_name: subscription.Coach.name,
        coach_email: subscription.Coach.email,
        expiry_date: subscription.end_date
      });
    }
    
    res.json({
      message: `Sent ${notificationsSent.length} expiring subscription notifications`,
      notificationsSent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private/Admin
const getNotificationSettings = async (req, res) => {
  try {
    // In a real application, you would fetch this from a settings table in your database
    // For now, we'll return default settings
    const settings = {
      expiringSubscriptionDays: 7,
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      emailTemplates: {
        expiringSubscription: {
          subject: 'Your subscription is expiring soon',
          body: 'Dear {{coach_name}},\n\nYour subscription to the {{plan_name}} plan is expiring on {{expiry_date}}. Please renew your subscription to continue enjoying our services.\n\nThank you,\nSuper Sheets Team'
        },
        paymentReminder: {
          subject: 'Payment Reminder',
          body: 'Dear {{coach_name}},\n\nThis is a reminder that your payment of ${{plan_price}} for the {{plan_name}} plan is pending. Please complete your payment to continue enjoying our services.\n\nThank you,\nSuper Sheets Team'
        }
      },
      smsTemplates: {
        expiringSubscription: 'Super Sheets: Your {{plan_name}} subscription expires on {{expiry_date}}. Please renew to continue service.',
        paymentReminder: 'Super Sheets: Your payment of ${{plan_price}} for {{plan_name}} is pending. Please complete payment to continue service.'
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private/Admin
const updateNotificationSettings = async (req, res) => {
  try {
    const { 
      expiringSubscriptionDays,
      enableEmailNotifications,
      enableSmsNotifications,
      emailTemplates,
      smsTemplates
    } = req.body;
    
    // In a real application, you would update these settings in your database
    // For now, we'll just return the updated settings
    const updatedSettings = {
      expiringSubscriptionDays: expiringSubscriptionDays || 7,
      enableEmailNotifications: enableEmailNotifications !== undefined ? enableEmailNotifications : true,
      enableSmsNotifications: enableSmsNotifications !== undefined ? enableSmsNotifications : false,
      emailTemplates: emailTemplates || {
        expiringSubscription: {
          subject: 'Your subscription is expiring soon',
          body: 'Dear {{coach_name}},\n\nYour subscription to the {{plan_name}} plan is expiring on {{expiry_date}}. Please renew your subscription to continue enjoying our services.\n\nThank you,\nSuper Sheets Team'
        },
        paymentReminder: {
          subject: 'Payment Reminder',
          body: 'Dear {{coach_name}},\n\nThis is a reminder that your payment of ${{plan_price}} for the {{plan_name}} plan is pending. Please complete your payment to continue enjoying our services.\n\nThank you,\nSuper Sheets Team'
        }
      },
      smsTemplates: smsTemplates || {
        expiringSubscription: 'Super Sheets: Your {{plan_name}} subscription expires on {{expiry_date}}. Please renew to continue service.',
        paymentReminder: 'Super Sheets: Your payment of ${{plan_price}} for {{plan_name}} is pending. Please complete payment to continue service.'
      }
    };
    
    res.json({
      message: 'Notification settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getNotifications,
  sendExpiringNotification,
  sendPaymentReminder,
  sendBulkExpiringNotifications,
  getNotificationSettings,
  updateNotificationSettings
};
