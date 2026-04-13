export const campusFixDepartments = [
  {
    name: "Housekeeping & Sanitation",
    email: "housekeeping.campusfix@gmail.com",
    phone: "919876543210"
  },
  {
    name: "Dean of Students / Warden",
    email: "dean.campusfix@gmail.com",
    phone: "919876543211"
  },
  {
    name: "Mess Committee",
    email: "mess.campusfix@gmail.com",
    phone: "919876543212"
  },
  {
    name: "Academic Affairs Office",
    email: "academics.campusfix@gmail.com",
    phone: "919876543213"
  },
  {
    name: "Estate & Maintenance",
    email: "maintenance.campusfix@gmail.com",
    phone: "919876543214"
  },
  {
    name: "General Administration",
    email: "admin.campusfix@gmail.com",
    phone: "919876543215"
  }
];

export const getDepartmentContact = (deptName) => {
  return campusFixDepartments.find(d => d.name === deptName) || campusFixDepartments[5]; // Default to General Admin
};

const seedComplaints = [
  {
    id: "CP-1204",
    description: "The wifi in the main library on the 2nd floor has been extremely spotty all week and disconnects every 10 minutes.",
    imageBase64: null,
    category: "Infrastructure/Maintenance",
    confidence: 90,
    aiReasoning: "Mentions wifi and disconnect issues which fall squarely under IT and infrastructure maintenance.",
    department: "Estate & Maintenance",
    status: "In Progress",
    submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    adminResponse: null,
    priority: "Medium"
  },
  {
    id: "CP-4491",
    description: "There is no water in the boy's hostel block B. The toilets cannot be flushed and it is a major hygiene risk.",
    imageBase64: null,
    category: "Bathroom & Hygiene",
    confidence: 95,
    aiReasoning: "Explicitly mentions toilets, no water, and hygiene risk.",
    department: "Housekeeping & Sanitation",
    status: "Submitted",
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    adminResponse: null,
    priority: "High"
  },
  {
    id: "CP-9902",
    description: "A group of seniors were threatening some first-year students near the cafeteria and forcing them to do weird tasks. It felt väga unsafe.",
    imageBase64: null,
    category: "Anti-Ragging & Safety",
    confidence: 98,
    aiReasoning: "Clearly describes a ragging incident involving seniors threatening freshmen.",
    department: "Dean of Students / Warden",
    status: "Resolved",
    submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    adminResponse: "Security has been dispatched. Disciplinary action is being taken against the identified seniors.",
    priority: "High"
  },
  {
    id: "CP-3042",
    description: "The lunch served today had a foul smell and many students are complaining of stomach ache after eating it.",
    imageBase64: null,
    category: "Mess & Food Quality",
    confidence: 94,
    aiReasoning: "Mentions lunch, food quality, smell, and health complaints directly related to the mess.",
    department: "Mess Committee",
    status: "In Progress",
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    adminResponse: null,
    priority: "High"
  },
  {
    id: "CP-5521",
    description: "The timetable for the End Semester exams has conflicting dates for CS301 and EE204. Both are scheduled for the same slot.",
    imageBase64: null,
    category: "Academic Issues",
    confidence: 96,
    aiReasoning: "Discusses exam timetables and course scheduling conflicts.",
    department: "Academic Affairs Office",
    status: "Submitted",
    submittedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    adminResponse: null,
    priority: "Medium"
  }
];

export const initDB = () => {
  if (!localStorage.getItem('campusFixDB')) {
    localStorage.setItem('campusFixDB', JSON.stringify({ complaints: seedComplaints }));
  }
  if (!localStorage.getItem('campusFixLogs')) {
    localStorage.setItem('campusFixLogs', JSON.stringify([]));
  }
  if (!localStorage.getItem('campusFixInbox')) {
    localStorage.setItem('campusFixInbox', JSON.stringify([]));
  }
  if (!localStorage.getItem('campusFixAIBuddyChats')) {
    localStorage.setItem('campusFixAIBuddyChats', JSON.stringify({}));
  }
};

// --- AUTHENTICATION / SESSION ---
export const getCurrentUser = () => {
  const user = localStorage.getItem('campusFixUser');
  return user ? JSON.parse(user) : null;
};

export const loginUser = (userObj) => {
  localStorage.setItem('campusFixUser', JSON.stringify(userObj));
};

export const logoutUser = () => {
  localStorage.removeItem('campusFixUser');
};

// --- COMPLAINTS ---
export const getComplaints = () => {
  const db = localStorage.getItem('campusFixDB');
  return db ? JSON.parse(db).complaints : [];
};

export const getComplaintsByStudent = (studentId) => {
  return getComplaints().filter(c => c.submittedBy === studentId);
};

export const addComplaint = (complaint) => {
  const complaints = getComplaints();
  complaints.push(complaint);
  localStorage.setItem('campusFixDB', JSON.stringify({ complaints }));
  addLog(complaint.id, "New complaint submitted", "Submitted");
};

export const updateComplaintStatus = (id, newStatus, adminResponse = null) => {
  const complaints = getComplaints();
  const index = complaints.findIndex(c => c.id === id);
  if (index !== -1) {
    complaints[index].status = newStatus;
    complaints[index].updatedAt = new Date().toISOString();
    if (adminResponse !== null) {
        complaints[index].adminResponse = adminResponse;
    }
    localStorage.setItem('campusFixDB', JSON.stringify({ complaints }));
    addLog(id, `Status updated to ${newStatus} by Admin`, newStatus);
  }
};

export const updateComplaintCategory = (id, newCategory, newDepartment) => {
  const complaints = getComplaints();
  const index = complaints.findIndex(c => c.id === id);
  if (index !== -1) {
    complaints[index].category = newCategory;
    complaints[index].department = newDepartment;
    complaints[index].updatedAt = new Date().toISOString();
    localStorage.setItem('campusFixDB', JSON.stringify({ complaints }));
    addLog(id, `Category set to ${newCategory} (Routed to ${newDepartment})`, complaints[index].status);
  }
};

export const getComplaintById = (id) => {
  return getComplaints().find(c => c.id === id) || null;
};

// Logs table
export const getLogs = () => {
  const logs = localStorage.getItem('campusFixLogs');
  return logs ? JSON.parse(logs) : [];
};

export const addLog = (trackingId, message, status) => {
  const logs = getLogs();
  logs.unshift({
    id: Math.random().toString(36).substring(7),
    trackingId,
    message,
    status,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('campusFixLogs', JSON.stringify(logs));
};

// Department Inbox table
export const getInboxMessages = () => {
  const inbox = localStorage.getItem('campusFixInbox');
  return inbox ? JSON.parse(inbox) : [];
};

export const addInboxMessage = (department, trackingId, message, timestamp = null) => {
  const inbox = getInboxMessages();
  inbox.unshift({
    id: Math.random().toString(36).substring(7),
    department,
    trackingId,
    message,
    timestamp: timestamp || new Date().toISOString(),
    read: false
  });
  localStorage.setItem('campusFixInbox', JSON.stringify(inbox));
};

export const markInboxMessageRead = (id) => {
  const inbox = getInboxMessages();
  const index = inbox.findIndex(m => m.id === id);
  if (index !== -1) {
    inbox[index].read = true;
    localStorage.setItem('campusFixInbox', JSON.stringify(inbox));
  }
};

// --- AI BUDDY CHATS ---
export const getAIBuddyChats = (studentId) => {
  const chats = localStorage.getItem('campusFixAIBuddyChats');
  if (chats) {
    const parsed = JSON.parse(chats);
    return parsed[studentId] || [];
  }
  return [];
};

export const saveAIBuddyChats = (studentId, messages) => {
  const chatsStr = localStorage.getItem('campusFixAIBuddyChats');
  let chats = {};
  if (chatsStr) {
    chats = JSON.parse(chatsStr);
  }
  chats[studentId] = messages;
  localStorage.setItem('campusFixAIBuddyChats', JSON.stringify(chats));
};
