import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Function to approve a user's registration.
 * This function will update the user's isPendingApproval status to false.
 * Only managers and admins can approve users.
 */
export const approveUser = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const managerId = context.auth.uid;
  const { userId } = data;
  
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required"
    );
  }
  
  try {
    // Get the manager's data to check role
    const db = admin.firestore();
    const managerDoc = await db.collection("users").doc(managerId).get();
    
    if (!managerDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Manager user not found"
      );
    }

    const managerData = managerDoc.data();
    
    // Only managers and admins can approve users
    if (managerData?.role !== "manager" && managerData?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only managers and admins can approve users"
      );
    }

    // Get the user data to check if they're pending approval
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User to approve not found"
      );
    }

    const userData = userDoc.data();
    
    if (!userData?.isPendingApproval) {
      return {
        success: true,
        message: "User is already approved"
      };
    }

    // Update the user's isPendingApproval status
    await db.collection("users").doc(userId).update({
      isPendingApproval: false,
      approvedBy: managerId,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: "User approved successfully"
    };
    
  } catch (error) {
    functions.logger.error("Error in approveUser function:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred"
    );
  }
});
