import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { NativeModules } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs';

import {
  compressImageForSMS,
  isCompressedImage,
  decompressImageForDisplay,
} from '../Utils/smsImageUtils';

const { DirectMessagingModule } = NativeModules;

const ThreadView = ({ route, navigation }) => {
  const { address } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fullImageUri, setFullImageUri] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: address });
    loadMessages();
    
    const intervalId = setInterval(loadMessages, 5000);
    return () => clearInterval(intervalId);
  }, [address]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await DirectMessagingModule.getMessagesForThread(address);
      setMessages(msgs.map(msg => ({
        ...msg,
        type: msg.type || (msg.address === address ? 2 : 1),
      })));
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Prevent sending uncompressed file URIs
    if (newMessage.startsWith('IMG:file:')) {
      Alert.alert('Error', 'Image compression failed. Please try again.');
      return;
    }

    setSending(true);
    const tempId = Date.now().toString();

    const newMsg = {
      id: tempId,
      body: newMessage,
      timestamp: Date.now(),
      type: 2,
      address: address,
    };

    setMessages(prev => [newMsg, ...prev]);
    setNewMessage('');

    try {
      await DirectMessagingModule.sendDirectSms(address, newMessage);
      await loadMessages();
    } catch (error) {
      console.error('SMS send error:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));


      //Alert.alert('Mannual SMS Permission Required', 'For your device need manual sms permission due to its sequrity policies');
    Alert.alert(
  "Important Permission Setup",
  "To allow ByteSMS to send SMS, go to Settings > Apps > ByteSMS > Permissions > SMS, and toggle it off and on again.",
  [
    { text: "Open Settings", onPress: () => Linking.openSettings() },
    { text: "Cancel", style: "cancel" },
  ]
);

    } finally {
      setSending(false);
    }
  };

  // ... (permission functions remain the same) ...

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const result = await check(PERMISSIONS.ANDROID.CAMERA);
      if (result === RESULTS.GRANTED) return true;

      const granted = await request(PERMISSIONS.ANDROID.CAMERA);
      return granted === RESULTS.GRANTED;
    }
    return true;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 30) {
        // Android 11+: Use scoped storage, no permission needed for app-specific directory
        return true;
      } else if (Platform.Version >= 29) {
        const result = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        if (result === RESULTS.GRANTED) return true;

        const granted = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        return granted === RESULTS.GRANTED;
      } else {
        const result = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        if (result === RESULTS.GRANTED) return true;

        const granted = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        return granted === RESULTS.GRANTED;
      }
    }
    return true;
  };
 ////

  const handleImagePick = () => {
    Alert.alert('Select Image Source', '', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
              Alert.alert('Permission required', 'Camera permission denied');
              return;
            }

            launchCamera(
              {
                mediaType: 'photo',
                includeBase64: false,
                quality: 0.7,
                saveToPhotos: true,
                cameraType: 'back',
              },
              async response => {
                if (response.didCancel || response.errorCode) return;
                
                if (response.assets?.[0]?.uri) {
                  try {
                    const compressed = await compressImageForSMS(response.assets[0].uri);
                    setNewMessage(compressed);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to compress image');
                  }
                }
              }
            );
          } catch (error) {
            Alert.alert('Error', 'Failed to access camera');
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          try {
            if (Platform.OS === 'android' && Platform.Version < 29) {
              const hasPermission = await requestStoragePermission();
              if (!hasPermission) return;
            }

            launchImageLibrary(
              {
                mediaType: 'photo',
                includeBase64: false,
                quality: 0.7,
                selectionLimit: 1,
              },
              async response => {
                if (response.didCancel || response.errorCode) return;
                
                if (response.assets?.[0]?.uri) {
                  try {
                    const compressed = await compressImageForSMS(response.assets[0].uri);
                    setNewMessage(compressed);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to compress image');
                  }
                }
              }
            );
          } catch (error) {
            Alert.alert('Error', 'Failed to access gallery');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const downloadImage = async (base64Data) => {
    if (!base64Data) return;

    try {
      if (Platform.OS === 'android' && Platform.Version < 30) {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission){
       Alert.alert('Permission required', 'Storage permission denied');
          return;
        };
      }

      const fileName = `image_${Date.now()}.jpg`;
      const destPath = `${RNFS.PicturesDirectoryPath}/${fileName}`;
      
      await RNFS.writeFile(destPath, base64Data, 'base64');
      Alert.alert('Success', `Image saved to Gallery`);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const renderItem = ({ item }) => {
    const isImg = isCompressedImage(item.body);
    const base64Data = isImg ? decompressImageForDisplay(item.body) : null;
    const imageUri = base64Data ? `data:image/jpeg;base64,${base64Data}` : null;

    return (
      <View style={[
        styles.messageBubble,
        item.type === 2 ? styles.sentMessage : styles.receivedMessage
      ]}>
        {isImg ? (
          <TouchableOpacity onPress={() => setFullImageUri(base64Data)}>
            <Image
              source={{ uri: imageUri }}
              style={styles.imageMessage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <Text style={styles.messageText}>{item.body}</Text>
        )}
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          inverted
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#128C7E" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text>No messages found</Text>
              </View>
            )
          }
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handleImagePick} style={styles.iconButton}>
            <Icon name="plus" size={28} color="#128C7E" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message"
            placeholderTextColor='#7f7f7f'
            multiline
            editable={!sending}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (sending || !newMessage.trim()) && styles.disabledButton,
            ]}
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <ActivityIndicator color="white" />
            ) : (
              // <Icon name="greator-than" size={18} color="white" />
              <Text style={{fontSize:27,color:'white',alignSelf:'center',textAlign:'center'}}> {'>'} </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Modal */}
      <Modal visible={!!fullImageUri} transparent>
        <View style={styles.modalContainer}>
          <Pressable 
            style={styles.modalBackground} 
            onPress={() => setFullImageUri(null)}
          >
            <Image
              source={{ uri: `data:image/jpeg;base64,${fullImageUri}` }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </Pressable>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => downloadImage(fullImageUri)}
          >
            <Text style={styles.downloadButtonText}>Save to Gallery</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0'},
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  messagesContainer: { paddingTop: 10, paddingBottom: 70},
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  messageText: { fontSize: 16 },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 25 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color:'black',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#cccccc' },
  iconButton: { 
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageMessage: { 
    width: 200, 
    height: 200, 
    borderRadius: 12,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#128C7E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ThreadView;


///////////////updated final 3.0

//final done
