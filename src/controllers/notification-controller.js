import Notification from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';

// Returns latest notifications and unread count for logged-in user
export async function listNotifications(request, response) {
  const notifications = await Notification
    .find({
      recipient: request.user._id,
    })
    .sort({
      createdAt: -1,
    })
    .limit(50);

  const unread = await Notification.countDocuments({
    recipient: request.user._id,
    readAt: null,
  });

  response.json({
    notifications,
    unread,
  });
}

// Returns only unread notification count
export async function unreadCount(request, response) {
  response.json({
    unread: await Notification.countDocuments({
      recipient: request.user._id,
      readAt: null,
    }),
  });
}

// Marks a single notification as read
export async function markRead(request, response) {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: request.params.id,
      recipient: request.user._id,
    },
    {
      readAt: new Date(),
    },
    {
      returnDocument: 'after',
    },
  );

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  response.json({
    notification,
  });
}

// Marks all unread notifications as read
export async function markAllRead(request, response) {
  await Notification.updateMany(
    {
      recipient: request.user._id,
      readAt: null,
    },
    {
      readAt: new Date(),
    }
  );

  response.json({
    message: 'All notifications marked as read',
  });
}