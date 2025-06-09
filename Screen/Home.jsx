import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { NativeModules } from 'react-native';

const { DirectMessagingModule } = NativeModules;

const Home = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const requestSMSPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: 'SMS Permission',
          message: 'ByteSMS needs permission to send SMS in background.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Permission error:', error);
      return false;
    }
  };

  const sendSMS = async () => {
    if (!phoneNumber || !message) {
      Alert.alert('Missing Fields', 'Please enter both phone number and message.');
      return;
    }

    if (Platform.OS === 'android') {
      const hasPermission = await requestSMSPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Cannot send SMS without permission.');
        return;
      }
    }

    try {
      if (!DirectMessagingModule || !DirectMessagingModule.sendDirectSms) {
        throw new Error('Native module not linked or not available.');
      }

      await DirectMessagingModule.sendDirectSms(phoneNumber, message);
      setStatus('SMS sent successfully');
      Alert.alert('Success', 'SMS sent successfully');
      setPhoneNumber('');
      setMessage('');
    } catch (error) {
      console.error('Error sending SMS:', error);
      setStatus('Failed to send SMS');
      Alert.alert('Error', error.message || 'SMS sending failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>ByteSMS - Send Background SMS</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your message"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.button}>
            <Button title="Send SMS" onPress={sendSMS} />
          </View>

          {status !== '' && <Text style={styles.status}>{status}</Text>}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
  },
  button: {
    marginTop: 10,
  },
  status: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'green',
  },
});

export default Home;
