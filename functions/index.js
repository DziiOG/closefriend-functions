
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

parse = message => {
	const {user, text, timestamp} = message.val()
	const {key: _id} = message
	const createdAt = new Date(timestamp)


	return {
		_id,
		createdAt,
		text,
		user
	}
}

firebase.initializeApp(firebaseConfig);

const db = admin.firestore();


app.post("/signup", (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		fullName: req.body.fullName,
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
	if (isEmpty(newUser.fullName)) {
		errors.fullName = "Must not be empty";
	}

	if (Object.keys(errors).length > 0) {
		return res.status(400).json(errors);
	}

	const noImg = "no-img.png";

	//Validate sign up
	let token, userId, imageUrl;

	db.doc(`/users/${newUser.fullName}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				return res
					.status(400)
					.json({ fullName: " this fullName is already taken " });
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
				fullName: newUser.fullName,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				userId,
                Tasks: [],
                messages: []
			};
			

			return db.doc(`/users/${newUser.fullName}`).set(userCredentials);
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
					fullName: doc.data().fullName,
				});
			});
			return users;
		})
		.then((array) => {
			array.forEach((element) => {
				if (element.userId == UserID.userId) {
					return res.status(201).json(element.fullName);
				}
			});
		})
		.catch((err) => {
			console.error(err.code);
			return res.status(403).json({ error: err.code });
		});
});

app.get("/users", (req, res) => {
	

	db.collection("users")
		.orderBy("createdAt", "desc")
		.get()
		.then((data) => {
			let users = [];
			data.forEach((doc) => {
				users.push({
					userId: doc.data().userId,
					fullName: doc.data().fullName,
				});
			});
			return users;
		})
		.then((users) => {
			return res.status(201).json({users})
		})
		.catch((err) => {
			console.error(err.code);
			return res.status(403).json({ error: err.code });
		});
});



app.post("/messages", (req, res)=>{
    const incomingMessages = {
        messages: req.body.messages,
        fullName: req.body.fullName
    }

    if(incomingMessages.fullName){

        incomingMessages.messages.forEach(
            item => {
                const message = {
                    text: item.text,
                    timestamp: item.createdAt,
                    user: item.user
                }
    
                db.collection("users")
            .doc(`${incomingMessages.fullName}`)
            .update({
                messages : admin.firestore.FieldValue.arrayUnion(message),
            })
            .then((doc) => {
                return res.status(201).json({ message: "Added succesfully" });
            })
            .catch((err) => {
                console.log(err.code);
                return res.status(500).json({ error: err.code });
            });
            }
        )
    }else return res.status(400).json({error: 'unauthenticated'})


    
    
});

app.put("/user/messages", (req, res) => {
	const UserID = {
		userId: req.body.userId,
	};

	db.collection("users")
		.orderBy("createdAt", "desc")
		.get()
		.then((data) => {
			let messages = [];
			data.forEach((doc) => {
				messages.push({
					userId: doc.data().userId,
					username: doc.data().username,
					messages: doc.data().messages,
				});
			});
			return messages;
		})
		.then((array) => {
			array.forEach((element) => {
				if (element.userId == UserID.userId) {
					return res.status(201).json(element.messages);
				}
			});
		})
		.catch((err) => {
			console.error(err.code);
			return res.status(403).json({ error: err.code });
		});
});


app.put("/messages", (req, res)=>{
    const incomingMessages = {
        fullName: req.body.fullName
    }

	db.collection("users")
	.doc(`${incomingMessages.fullName}`)
	.update({
		messages: admin.firestore.FieldValue.delete(),
	})
	.then((doc) => {
		return res.status(201).json({ message: "Deleted succesfully" });
	})
	.catch((err) => {
		console.log(err.code);
		return res.status(500).json({ error: err.code });
	});

    
    
});





/*
app.post("/create/chatroom", (req, res)=>{
	const chatRoom = {
		name: req.body.name
	}


	db.doc(`/chatroom/${chatRoom.name}`)
			.get()
			.then((doc) => {
				if (doc.exists) {
					return res
						.status(400)
						.json({ chatroom: "chatroom already exists" });
				} else {
					const messages = []

					return db.doc(`/chatroom/${chatRoom.name}`).update({
						messages: admin.firestore.FieldValue.arrayUnion(messages),
					})
				}
			})
			.then((response)=> {
				res.status(201).json({message: "Created Successfully", response})
			}).catch((err) => {
				
				return res.status(500).json({ error: err.code });
				
			});
})

app.post("/messages/chatroom", (req, res)=>{
    const incomingMessages = {
        messages: req.body.messages,
        name: req.body.name
    }

    if(incomingMessages.name){

        incomingMessages.messages.forEach(
            item => {
                const message = {
                    text: item.text,
                    timestamp: item.timestamp,
                    user: item.user
                }
    
                db.collection("chatroom")
            .doc(`${incomingMessages.name}`)
            .update({
                messages : admin.firestore.FieldValue.arrayUnion(message),
            })
            .then((doc) => {
                return res.status(201).json({ message: "Added succesfully" });
            })
            .catch((err) => {
                console.log(err.code);
                return res.status(500).json({ error: err.code });
            });
            }
        )
    }else return res.status(400).json({error: 'unauthenticated'})
  
});


app.get("/messages/chatroom", (req, res) => {
	const chatRoom = {
		name: req.body.name
	}

	db.doc(`/chatroom/${chatRoom.name}`).get().then((doc)=>{
		return res.status(201).json({doc})
	}).catch((err) => {
				
		return res.status(500).json({ error: err.code });
		
	});
});
*/


exports.api = functions.https.onRequest(app);