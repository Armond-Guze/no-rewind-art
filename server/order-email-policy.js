const customerOrderEmailDefinitions = {
  confirmation: {
    flagName: 'confirmationEmailSentAt',
    notificationType: 'customer_confirmation_email',
  },
  shipping: {
    flagName: 'shippedEmailSentAt',
    notificationType: 'customer_shipped_email',
  },
  delivered: {
    flagName: 'deliveredEmailSentAt',
    notificationType: 'customer_delivered_email',
  },
};

function policyError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function getCustomerEmailStatus(env = process.env) {
  return {
    customerEmailsConfigured: Boolean(env.RESEND_API_KEY),
    customerEmailsAutomatic: env.CUSTOMER_EMAILS_AUTOMATIC === 'true',
    ownerAlertsConfigured: Boolean(env.RESEND_API_KEY && env.ORDER_NOTIFICATION_EMAIL),
  };
}

export function getCustomerOrderEmailDefinition(emailType) {
  return customerOrderEmailDefinitions[emailType] || null;
}

export function parseManualOrderEmailRequest(body) {
  const requestBody = body && typeof body === 'object' ? body : {};
  const emailType = String(requestBody.emailType || '').trim();

  if (!getCustomerOrderEmailDefinition(emailType)) {
    throw policyError('emailType must be confirmation, shipping, or delivered.');
  }

  if (Object.hasOwn(requestBody, 'resend') && typeof requestBody.resend !== 'boolean') {
    throw policyError('resend must be true or false.');
  }

  return {
    emailType,
    resend: requestBody.resend === true,
  };
}

export function assertManualOrderEmailAllowed(
  order,
  { emailType, resend = false, hasSentNotification = false } = {},
) {
  const definition = getCustomerOrderEmailDefinition(emailType);

  if (!definition) {
    throw policyError('emailType must be confirmation, shipping, or delivered.');
  }

  if (order.paymentStatus !== 'paid') {
    throw policyError('Customer emails can only be sent for paid orders.', 409);
  }

  if (!order.customerEmail) {
    throw policyError('This order does not have a customer email address.', 409);
  }

  if (emailType === 'shipping') {
    if (!order.trackingNumber && !order.trackingUrl) {
      throw policyError('Save a tracking number or tracking URL before sending the shipping email.', 409);
    }

    if (order.fulfillmentStatus !== 'shipped') {
      throw policyError('Mark the order shipped before sending the shipping email.', 409);
    }
  }

  if (emailType === 'delivered' && order.fulfillmentStatus !== 'delivered') {
    throw policyError('Mark the order delivered before sending the delivery follow-up email.', 409);
  }

  const alreadySent = Boolean(
    order.raw?.[definition.flagName] ||
      (emailType === 'confirmation' && order.raw?.customerConfirmationEmailSentAt) ||
      hasSentNotification,
  );

  if (alreadySent && !resend) {
    throw policyError(
      `This ${emailType} email was already sent. Set resend to true to deliberately send it again.`,
      409,
    );
  }

  return definition;
}
