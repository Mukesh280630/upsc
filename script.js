// ============================================================================
// 1. FIREBASE INITIALIZATION & SETUP
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBLnvyn8yl29KXSwY-tAT17q_LX5YrDnRg",
    authDomain: "upschub-c5ff8.firebaseapp.com",
    projectId: "upschub-c5ff8",
    storageBucket: "upschub-c5ff8.firebasestorage.app",
    messagingSenderId: "731328484163",
    appId: "1:731328484163:web:a06e50b1e0a1bdeb4b15f6"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Set up cloud database and authentication variables
const db = firebase.firestore();
const auth = firebase.auth();


// ============================================================================
// 2. AUTHENTICATION LOGIC (LOGIN & REGISTRATION)
// ============================================================================

// Switch between Login and Register forms
function toggleForms(mode) {
    if (mode === 'register') {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'block';
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('register-section').style.display = 'none';
    }
}

// Register a new student online
function registerUser() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (email === "" || password === "") {
        alert("Please fill in both email and password.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Registration Successful! You can now log in.");
            document.getElementById('reg-email').value = "";
            document.getElementById('reg-password').value = "";
            toggleForms('login');
        })
        .catch((error) => {
            alert("Registration Error: " + error.message);
        });
}

// Login an existing student or admin online
function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (email === "" || password === "") {
        alert("Please enter your email and password.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Login Successful!");
            
            // Route Admin to Admin panel, Students to the main Index page
            if (email === "kannamukesh33@gmail.com") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        })
        .catch((error) => {
            alert("Login Error: " + error.message);
        });
}

// Logout Function (You can add a logout button on admin.html/index.html calling this)
function logoutUser() {
    auth.signOut().then(() => {
        alert("Logged out successfully.");
        window.location.href = "login.html";
    }).catch((error) => {
        alert("Error logging out: " + error.message);
    });
}


// ============================================================================
// 3. FIRESTORE DATABASE LOGIC (STUDY MATERIALS)
// ============================================================================

// Function to Add a new Study Material (Used on admin.html)
// Note: Ensure your admin.html form inputs have these IDs: 'title', 'category', 'link'
function addMaterial(event) {
    if(event) event.preventDefault(); // Prevent page reload if inside a form

    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value.trim();
    const link = document.getElementById('link').value.trim();

    if (title === "" || category === "" || link === "") {
        alert("Please fill out all fields before uploading.");
        return;
    }

    // Save to Firebase Firestore collection named "materials"
    db.collection("materials").add({
        title: title,
        category: category,
        link: link,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // Keeps items in order
    })
    .then(() => {
        alert("Material successfully added to cloud database!");
        // Clear input fields
        document.getElementById('title').value = "";
        document.getElementById('category').value = "";
        document.getElementById('link').value = "";
        
        // Reload the list to show the new item
        loadMaterials(); 
    })
    .catch((error) => {
        alert("Error adding material: " + error.message);
    });
}

// Function to Load Materials (Used on both admin.html and index.html)
// Note: Ensure you have a <div> or <tbody> with id="materials-list" to display them
function loadMaterials() {
    const listContainer = document.getElementById('materials-list');
    
    // If the element doesn't exist on this specific page, stop the function
    if (!listContainer) return; 

    // Fetch data from Firestore, ordered by newest first
    db.collection("materials").orderBy("timestamp", "desc").onSnapshot((querySnapshot) => {
        listContainer.innerHTML = ""; // Clear existing list before loading new data

        querySnapshot.forEach((doc) => {
            const material = doc.data();
            const materialId = doc.id; // Firebase unique ID for deleting

            // Create HTML layout for each item
            // Edit this HTML string to match your exact CSS styling!
            const itemHTML = `
                <div class="material-card" style="border: 1px solid #ccc; padding: 15px; margin: 10px 0;">
                    <h3>${material.title}</h3>
                    <p><strong>Category:</strong> ${material.category}</p>
                    <a href="${material.link}" target="_blank" style="color: blue;">Download / View Link</a>
                    <br><br>
                    <button onclick="deleteMaterial('${materialId}')" style="background-color: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">Delete</button>
                </div>
            `;
            
            listContainer.innerHTML += itemHTML;
        });
    });
}

// Function to Delete a Material from the Database (Used on admin.html)
function deleteMaterial(docId) {
    if (confirm("Are you sure you want to delete this material permanently?")) {
        db.collection("materials").doc(docId).delete().then(() => {
            alert("Material deleted successfully.");
        }).catch((error) => {
            alert("Error removing material: " + error.message);
        });
    }
}

// Automatically load materials when the page opens (if the container exists)
window.onload = function() {
    loadMaterials();
};