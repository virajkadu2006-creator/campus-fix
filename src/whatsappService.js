export const sendWhatsAppNotification = async (departmentContact, aiMessage, trackingId) => {
  // Option A: Hackathon Safe wa.me link generation
  // We format the message to be URL safe for WhatsApp
  const formattedMessage = `*New CampusFix Assignment: ${trackingId}*\n\n${aiMessage}`;
  const encodedMessage = encodeURIComponent(formattedMessage);
  
  // Format phone number (remove any + or spaces, ensure country code)
  const phone = departmentContact.phone.replace(/[^0-9]/g, '');
  
  const waLink = `https://wa.me/${phone}?text=${encodedMessage}`;

  // In a real automated system this would be a twilio/meta API call.
  // For the frontend-only hackathon version, we simulate the 'sending' delay,
  // then we return the link so the UI can prompt the user to trigger it,
  // or we can auto-open it.

  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        simulated: true, 
        waLink 
      });
    }, 1500);
  });
};
