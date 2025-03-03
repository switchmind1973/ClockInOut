// script.js

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzx6QYKVN0nXhLwMeiLkFjn98VajWIIBND-aVUjz-Nr1jLMjG9vdekVKZ8Hh6sr6fM4/exec'; // Replace with your Web App URL

let clockedInTime = null;
let clockedOutTime = null;
let intervalId = null;
let currentEmployeeId = null; // Track the currently logged-in employee

// Sample employee data (replace with data from Google Sheets later)
const employees = [
  { id: '2025-053', pin: '2553' },
  { id: '2021-007', pin: '2107' },
  { id: '2021-006', pin: '1210' },
  { id: '2019-004', pin: '1145' },
];

// Function to send data to Google Sheets
async function sendToGoogleSheets(data) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      mode: 'no-cors', // Add this line to bypass CORS
    });

    const result = await response.text();
    console.log(result); // Log the response from Google Apps Script
  } catch (error) {
    console.error('Error submitting data:', error);
    showToast('Error submitting data. Please try again.');
  }
}

// Function to submit TimeLog data
function submitTimeLog(date, employeeId, clockIn, clockOut) {
  const data = {
    type: 'timeLog',
    date: date, // Include the date
    employeeId: employeeId,
    clockIn: clockIn || '', // Send empty string if clockIn is not provided
    clockOut: clockOut || '' // Send empty string if clockOut is not provided
  };
  sendToGoogleSheets(data);
}

// Function to submit OvertimeLog data
function submitOvertimeLog(date, employeeId, reason) {
  const data = {
    type: 'overtimeLog',
    date: date,
    employeeId: employeeId,
    reason: reason,
  };
  sendToGoogleSheets(data);
}

// Fetch Employee IDs from Google Sheets (Mock for now)
function fetchEmployeeIDs() {
  const dropdown = document.getElementById('employeeDropdown');
  dropdown.innerHTML = '<option value="">Select Employee ID</option>';
  employees.forEach((emp) => {
    dropdown.innerHTML += `<option value="${emp.id}">${emp.id}</option>`;
  });
}

// Save clock state to localStorage
function saveClockState(employeeId) {
  const state = {
    clockedInTime: clockedInTime,
    clockedOutTime: clockedOutTime,
  };
  localStorage.setItem(`clockState_${employeeId}`, JSON.stringify(state));
}

// Load clock state from localStorage
function loadClockState(employeeId) {
  const state = JSON.parse(localStorage.getItem(`clockState_${employeeId}`));
  if (state) {
    clockedInTime = state.clockedInTime ? new Date(state.clockedInTime) : null;
    clockedOutTime = state.clockedOutTime ? new Date(state.clockedOutTime) : null;

    if (clockedInTime && !clockedOutTime) {
      document.getElementById('clockBtn').textContent = 'Clock Out';
      document.getElementById('clockedInTime').textContent = `Clocked In: ${clockedInTime.toLocaleTimeString()}`;
      startRenderedHoursInterval();
    } else {
      document.getElementById('clockBtn').textContent = 'Clock In';
      document.getElementById('clockedInTime').textContent = '';
      document.getElementById('clockedOutTime').textContent = '';
    }
  } else {
    // Reset clock data if no state is found
    clockedInTime = null;
    clockedOutTime = null;
    document.getElementById('clockBtn').textContent = 'Clock In';
    document.getElementById('clockedInTime').textContent = '';
    document.getElementById('clockedOutTime').textContent = '';
  }
}

// Start the rendered hours interval
function startRenderedHoursInterval() {
  intervalId = setInterval(calculateRenderedHours, 1000);
}

// Update Current Date and Time
function updateDateTime() {
  const now = new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: '2-digit' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOptions);
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', timeOptions);

  // Automatically log out at 12:00 AM
  if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
    logout();
  }
}

// Calculate Rendered Hours and Overtime
function calculateRenderedHours() {
  if (!clockedInTime) return;

  const now = new Date();
  const renderedMs = now - clockedInTime;

  // Subtract 6 minutes (360,000 milliseconds) for the grace period
  const adjustedRenderedMs = renderedMs - 360000;

  const renderedHours = Math.floor(adjustedRenderedMs / 3600000);
  const renderedMinutes = Math.floor((adjustedRenderedMs % 3600000) / 60000);
  const renderedSeconds = Math.floor((adjustedRenderedMs % 60000) / 1000);

  const overtime = renderedHours > 8 ? renderedHours - 8 : 0;

  document.getElementById('renderedHours').textContent = `Rendered Hours: ${String(renderedHours).padStart(2, '0')}:${String(renderedMinutes).padStart(2, '0')}:${String(renderedSeconds).padStart(2, '0')}`;
  document.getElementById('overtime').textContent = `Overtime: ${String(overtime).padStart(2, '0')}:00`;
}

// Show Toast Notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => (toast.style.display = 'none'), 3000);
}

// Logout Function
function logout() {
  // Save clock state before logging out
  if (currentEmployeeId) {
    saveClockState(currentEmployeeId);
  }

  // Hide time clock form and show login form
  document.getElementById('timeClockForm').classList.add('hidden');
  document.getElementById('historyDashboard').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');

  // Reset clock data
  clockedInTime = null;
  clockedOutTime = null;
  currentEmployeeId = null;
  document.getElementById('clockBtn').textContent = 'Clock In';
  document.getElementById('clockedInTime').textContent = '';
  document.getElementById('renderedHours').textContent = '';
  document.getElementById('overtime').textContent = '';
  document.getElementById('clockedOutTime').textContent = '';

  // Stop calculating rendered hours
  clearInterval(intervalId);
}

// Validate Employee ID and PIN
function validateEmployee(employeeId, pin) {
  return employees.find((emp) => emp.id === employeeId && emp.pin === pin);
}

// Function to add a record to the clock history
function addToClockHistory(action) {
  const now = new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: '2-digit' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

  // Subtract 6 minutes for the grace period
  now.setMinutes(now.getMinutes() - 6);

  const record = {
    date: now.toLocaleDateString('en-US', dateOptions),
    action: action,
    time: now.toLocaleTimeString('en-US', timeOptions),
    timestamp: now.getTime(), // Add timestamp for sorting
  };

  // Load existing history for the employee
  let history = JSON.parse(localStorage.getItem(`clockHistory_${currentEmployeeId}`)) || [];
  history.push(record);

  // Sort history by timestamp (most recent first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  // Save updated history to localStorage
  localStorage.setItem(`clockHistory_${currentEmployeeId}`, JSON.stringify(history));

  // Update the clock history table
  updateClockHistoryTable();
}

// Function to update the clock history table
function updateClockHistoryTable() {
  const historyTable = document.getElementById('historyTable');
  historyTable.innerHTML = '';

  // Load history for the logged-in employee
  const history = JSON.parse(localStorage.getItem(`clockHistory_${currentEmployeeId}`)) || [];

  history.forEach((record) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-3 text-left">${record.date}</td>
      <td class="p-3 text-left">${record.action}</td>
      <td class="p-3 text-left">${record.time}</td>
    `;
    historyTable.appendChild(row);
  });
}

// Clear History Button Logic
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear your clock history? This action cannot be undone.')) {
    // Clear the history for the logged-in employee
    localStorage.removeItem(`clockHistory_${currentEmployeeId}`);

    // Update the clock history table
    updateClockHistoryTable();

    // Show success message
    showToast('Clock history cleared successfully!');
  }
});

// Login Button Logic
document.getElementById('loginBtn').addEventListener('click', () => {
  const selectedEmployeeId = document.getElementById('employeeDropdown').value;
  const enteredPin = document.getElementById('employeePin').value;

  if (!selectedEmployeeId || !enteredPin) {
    alert('Please select an Employee ID and enter your PIN.');
    return;
  }

  const employee = validateEmployee(selectedEmployeeId, enteredPin);
  if (!employee) {
    alert('Invalid Employee ID or PIN.');
    return;
  }

  // Set the current employee ID
  currentEmployeeId = selectedEmployeeId;

  // Display the logged-in employee label
  document.getElementById('loggedInEmployee').textContent = `Logged in as: ${currentEmployeeId}`;

  // Hide login form and show time clock form
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('timeClockForm').classList.remove('hidden');
  document.getElementById('historyDashboard').classList.remove('hidden');

  // Load clock state for the logged-in employee
  loadClockState(currentEmployeeId);

  // Load and display clock history for the logged-in employee
  updateClockHistoryTable();

  // Start updating date and time
  setInterval(updateDateTime, 1000);
});

// Clock In/Out Button Logic
document.getElementById('clockBtn').addEventListener('click', () => {
  const now = new Date();
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const dateOptions = { year: 'numeric', month: 'long', day: '2-digit' };

  // Subtract 6 minutes for the grace period
  now.setMinutes(now.getMinutes() - 6);

  const currentDate = now.toLocaleDateString('en-US', dateOptions); // Get the current date

  if (!clockedInTime) {
    // Clock In
    clockedInTime = now;
    document.getElementById('clockedInTime').textContent = `Clocked In: ${now.toLocaleTimeString('en-US', timeOptions)}`;
    document.getElementById('clockBtn').textContent = 'Clock Out';
    showToast('Clocked In Successfully!');

    // Add to clock history
    addToClockHistory('Clock In');

    // Save clock state
    saveClockState(currentEmployeeId);

    // Submit TimeLog data to Google Sheets
    submitTimeLog(
      currentDate, // Pass the current date
      currentEmployeeId,
      now.toLocaleTimeString('en-US', timeOptions),
      '' // No clock out time for clock in
    );

    // Start calculating rendered hours
    intervalId = setInterval(calculateRenderedHours, 1000);
  } else {
    // Clock Out
    clockedOutTime = now;
    document.getElementById('clockedOutTime').textContent = `Clocked Out: ${now.toLocaleTimeString('en-US', timeOptions)}`;
    document.getElementById('clockBtn').textContent = 'Clock In';
    showToast('Clocked Out Successfully!');

    // Add to clock history
    addToClockHistory('Clock Out');

    // Save clock state
    saveClockState(currentEmployeeId);

    // Submit TimeLog data to Google Sheets
    submitTimeLog(
      currentDate, // Pass the current date
      currentEmployeeId,
      '', // No clock in time for clock out
      now.toLocaleTimeString('en-US', timeOptions)
    );

    // Stop calculating rendered hours
    clearInterval(intervalId);

    // Reset clock data
    clockedInTime = null;
    clockedOutTime = null;
    document.getElementById('clockedInTime').textContent = '';
    document.getElementById('renderedHours').textContent = '';
    document.getElementById('overtime').textContent = '';
    document.getElementById('clockedOutTime').textContent = '';
  }
});

// Overtime Request Button Logic
document.getElementById('overtimeRequestBtn').addEventListener('click', () => {
  document.getElementById('overtimeRequestModal').classList.remove('hidden');
});

document.getElementById('cancelOvertimeBtn').addEventListener('click', () => {
  document.getElementById('overtimeRequestModal').classList.add('hidden');
});

document.getElementById('submitOvertimeBtn').addEventListener('click', () => {
  const reason = document.getElementById('overtimeReason').value;
  if (!reason) {
    alert('Please enter a reason for overtime.');
    return;
  }

  // Add to clock history
  addToClockHistory('Overtime Request');

  // Show success message
  showToast('Overtime request submitted successfully!');

  // Submit OvertimeLog data to Google Sheets
  const now = new Date();
  submitOvertimeLog(
    now.toLocaleDateString('en-US'),
    currentEmployeeId,
    reason
  );

  // Clear the textarea and hide the modal
  document.getElementById('overtimeReason').value = '';
  document.getElementById('overtimeRequestModal').classList.add('hidden');
});

// Logout Button Logic
document.getElementById('logoutBtn').addEventListener('click', logout);

// Fetch employee IDs on page load
fetchEmployeeIDs();
