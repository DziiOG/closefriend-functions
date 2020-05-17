const functions = require('firebase-functions');

const admin = require("firebase-admin");
const app = require("express")();
const firebase = require("firebase");
admin.initializeApp();

const firebaseConfig = {
	apiKey: "AIzaSyA6fLl3IbSgEQxFNN7kkT05t9AxZZfSBXA",
  authDomain: "closefriend-1333a.firebaseapp.com",
  databaseURL: "https://closefriend-1333a.firebaseio.com",
  projectId: "closefriend-1333a",
  storageBucket: "closefriend-1333a.appspot.com",
  messagingSenderId: "313771334944",
  appId: "1:313771334944:web:fe75060b47796493d1cb45",
  measurementId: "G-3BB17TNXB3"
};

//Helper Functions
const isEmail = (email) => {
	const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (email.match(regEx)) return true;
	else return false;
};

const isEmpty = (string) => {
	if (string.trim() === "") return true;
	else return false;
};

firebase.initializeApp(firebaseConfig);

const db = admin.firestore();


app.post("/signup", (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		username: req.body.username,
	};

	let errors = {};
	if (isEmpty(newUser.email)) {
		errors.email = "Email must not be empty";
	} else if (!isEmail(newUser.email)) {
		errors.email = "Must be a valid email address";
	}

	if (isEmpty(newUser.password)) {
		errors.password = "Must not be empty";
	}
	if (isEmpty(newUser.username)) {
		errors.username = "Must not be empty";
	}

	if (Object.keys(errors).length > 0) {
		return res.status(400).json(errors);
	}

	const noImg = "no-img.png";

	//Validate sign up
	let token, userId, imageUrl;

	db.doc(`/users/${newUser.username}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				return res
					.status(400)
					.json({ username: " this username is already taken " });
			} else {
				return firebase
					.auth()
					.createUserWithEmailAndPassword(
						newUser.email,
						newUser.password
					);
			}
		})
		.then((data) => {
			userId = data.user.uid;

			return data.user.getIdToken();
		})
		.then((idToken) => {
			token = idToken;
			const userCredentials = {
				username: newUser.username,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
				userId,
				Trips: [],
			};
			imageUrl = userCredentials.imageUrl;

			return db.doc(`/users/${newUser.username}`).set(userCredentials);
			//return true
		})
		.then(() => {
			return res.status(201).json({ token, userId, imageUrl });
		})

		.catch((err) => {
			console.error(err);
			if (err.code === "auth/email-already-in-use") {
				return res
					.status(400)
					.json({ email: "Email is already in use" });
			} else {
				return res.status(500).json({ error: err.code });
			}
		});
});

app.post("/login", (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password,
	};

	//Validations

	let errors = {};

	if (isEmpty(user.email)) {
		errors.email = "Must not be empty";
	} else if (!isEmail(user.email)) {
		errors.email = "Must be a valid email address";
	}

	if (isEmpty(user.password)) {
		errors.password = "Must not be empty";
	}

	if (Object.keys(errors).length > 0)
		return resizeTo.status(400).json(errors);

	let userId;
	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((token) => {
			return res.json({ token, userId });
		})
		.catch((err) => {
			console.error(err);
			if (err.code === "auth/wrong-password") {
				return res.status(403).json({
					general: "Wrong credentials, please try again",
				});
			} else if (err.code === "auth/user-not-found") {
				return res.status(403).json({
					general:
						"Email did not match any acount or wrong credentials",
				});
			} else {
				return res.status(500).json({ error: err.code });
			}
		});
});

app.post("/user", (req, res) => {
	const UserID = {
		userId: req.body.userId,
	};

	db.collection("users")
		.orderBy("createdAt", "desc")
		.get()
		.then((data) => {
			let users = [];
			data.forEach((doc) => {
				users.push({
					userId: doc.data().userId,
					username: doc.data().username,
				});
			});
			return users;
		})
		.then((array) => {
			array.forEach((element) => {
				if (element.userId == UserID.userId) {
					return res.status(201).json(element.username);
				}
			});
		})
		.catch((err) => {
			console.error(err.code);
			return res.status(403).json({ error: err.code });
		});
});

exports.api = functions.https.onRequest(app);