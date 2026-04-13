export const sendEmailNotification = async (departmentContact, aiMessage, trackingId) => {
  const serviceId = localStorage.getItem('campusFixEmailServiceId');
  const templateId = localStorage.getItem('campusFixEmailTemplateId');
  const publicKey = localStorage.getItem('campusFixEmailPublicKey');

  if (!serviceId || !templateId || !publicKey) {
    console.warn("EmailJS credentials not found in localStorage. Simulated email send successfully.");
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve({ success: true, simulated: true }), 1500));
  }

  const templateParams = {
    to_email: departmentContact.email,
    to_name: departmentContact.name,
    tracking_id: trackingId,
    message: aiMessage
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EmailJS Error: ${text}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
