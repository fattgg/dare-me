/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.database();

exports.notifyOnDareUpdate = functions.database
  .ref("/dares/{dareId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.val();
    const afterData = change.after.val();
    const dareId = context.params.dareId;
    const notificationsRef = db.ref("/notifications");

    const promises = [];

    if (beforeData.likes !== afterData.likes) {
      promises.push(
        notificationsRef.push(
          {
            type: "like",
            dareId: dareId,
            userId: afterData.userId || "",
            message:
              "Someone liked your dare: \"" +
              (afterData.challenge || "") +
              "\"",
            timestamp: admin.database.ServerValue.TIMESTAMP,
          },
        ),
      );
    }

    // Comments
    const beforeComments = beforeData.comments || [];
    const afterComments = afterData.comments || [];
    if (beforeComments.length !== afterComments.length) {
      promises.push(
        notificationsRef.push(
          {
            type: "comment",
            dareId: dareId,
            userId: afterData.userId || "",
            message:
              "Someone commented on your dare: \"" +
              (afterData.challenge || "") +
              "\"",
            timestamp: admin.database.ServerValue.TIMESTAMP,
          },
        ),
      );
    }

    // Accepted
    if (beforeData.acceptedBy !== afterData.acceptedBy) {
      promises.push(
        notificationsRef.push(
          {
            type: "accept",
            dareId: dareId,
            userId: afterData.userId || "",
            message:
              "Someone accepted your dare: \"" +
              (afterData.challenge || "") +
              "\"",
            timestamp: admin.database.ServerValue.TIMESTAMP,
          },
        ),
      );
    }

    return Promise.all(promises);
  });

exports.notifyOnDareCompletion = functions.database
  .ref("/dares/{dareId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.val();
    const afterData = change.after.val();
    const dareId = context.params.dareId;

    if (beforeData.status !== "completed" && afterData.status === "completed") {
      const notificationsRef = db.ref("/notifications");
      await notificationsRef.push({
        type: "complete",
        dareId: dareId,
        userId: afterData.userId, // The owner of the dare
        message: `Your dare "${afterData.challenge}" has been completed!`,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    }

    await update(ref(db, `dares/${dareId}`), {
      evidence: ...,
      evidenceType: ...,
      evidenceUrl: ...,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  });
