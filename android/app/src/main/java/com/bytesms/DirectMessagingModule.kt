package com.bytesms

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.telephony.SmsManager
import android.util.Log
import com.facebook.react.bridge.*

class DirectMessagingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DirectMessagingModule"

    ///updated sendmessage for multipart message
   @ReactMethod
fun sendDirectSms(phoneNumber: String, message: String, promise: Promise) {
    try {
        val smsManager = SmsManager.getDefault()

        val parts = smsManager.divideMessage(message)
        smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)

        promise.resolve("SMS sent successfully (multipart handled)")
    } catch (e: Exception) {
        promise.reject("SEND_SMS_ERROR", "Failed to send SMS", e)
    }
}


    // Get Contact Name
    @ReactMethod
    fun getContactName(phoneNumber: String, promise: Promise) {
        try {
            val contentResolver = reactApplicationContext.contentResolver
            val uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(phoneNumber)
            )

            val cursor = contentResolver.query(
                uri,
                arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME),
                null,
                null,
                null
            )

            cursor.use {
                if (it != null && it.moveToFirst()) {
                    val name = it.getString(0)
                    Log.d("ContactLookup", "Found contact for $phoneNumber: $name")
                    promise.resolve(name)
                    return
                }
            }

            Log.d("ContactLookup", "No contact found for $phoneNumber")
            promise.resolve(phoneNumber) // fallback

        } catch (e: Exception) {
            Log.e("ContactLookup", "Error fetching contact name", e)
            promise.reject("ERROR", "Failed to fetch contact name", e)
        }
    }

    // Get All Conversations
    @ReactMethod
    fun getAllConversations(promise: Promise) {
        try {
            val conversations = getSmsConversations()
            promise.resolve(conversations)
        } catch (e: Exception) {
            promise.reject("READ_SMS_ERROR", "Failed to read conversations", e)
        }
    }

    // Get Messages for Specific Address
    @ReactMethod
    fun getMessagesForThread(address: String, promise: Promise) {
        try {
            val messages = getSmsMessages(address)
            promise.resolve(messages)
        } catch (e: Exception) {
            promise.reject("READ_SMS_ERROR", "Failed to read messages", e)
        }
    }

    // Internal: Get SMS Conversations
    private fun getSmsConversations(): WritableArray {
        val conversations = Arguments.createArray()
        val uri = Uri.parse("content://mms-sms/conversations")
        val projection = arrayOf(
            "thread_id AS _id",
            "address",
            "body",
            "date",
            "COUNT(*) AS msg_count"
        )

        reactApplicationContext.contentResolver.query(
            uri,
            projection,
            null,
            null,
            "date DESC"
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                conversations.pushMap(createConversationMap(cursor))
            }
        }

        return conversations
    }

    // Internal: Get Messages for an Address
    private fun getSmsMessages(address: String): WritableArray {
        val messages = Arguments.createArray()
        val uri = Uri.parse("content://sms")
        val selection = "address = ?"
        val selectionArgs = arrayOf(address)

        reactApplicationContext.contentResolver.query(
            uri,
            null,
            selection,
            selectionArgs,
            "date DESC"
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                messages.pushMap(createMessageMap(cursor))
            }
        }

        return messages
    }

    // Internal: Map One Conversation
    private fun createConversationMap(cursor: Cursor): WritableMap {
        return Arguments.createMap().apply {
            putString("threadId", cursor.getString(0))
            putString("address", cursor.getString(1))
            putString("lastMessage", cursor.getString(2))
            putDouble("timestamp", cursor.getLong(3).toDouble())
            putInt("messageCount", cursor.getInt(4))
        }
    }

    // Internal: Map One Message
    private fun createMessageMap(cursor: Cursor): WritableMap {
        return Arguments.createMap().apply {
            putString("id", cursor.getString(cursor.getColumnIndex("_id")))
            putString("address", cursor.getString(cursor.getColumnIndex("address")))
            putString("body", cursor.getString(cursor.getColumnIndex("body")))
            putDouble("timestamp", cursor.getLong(cursor.getColumnIndex("date")).toDouble())
            putInt("type", cursor.getInt(cursor.getColumnIndex("type"))) // 1=received, 2=sent
        }
    }
}

///working all permisiion done   7:23:   5/25
///////////7:00 5/27