import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeModules } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Modal from 'react-native-modal';
import Contacts from 'react-native-contacts';

const { DirectMessagingModule } = NativeModules;

const AllConversations = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [customNumber, setCustomNumber] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearchLoading, setContactSearchLoading] = useState(false);

  const requestPermissions = async () => {
    try {
      const [smsGranted, contactsGranted] = await Promise.all([
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS),
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS),
      ]);
      return (
        smsGranted === PermissionsAndroid.RESULTS.GRANTED &&
        contactsGranted === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getContactName = async (phoneNumber) => {
    try {
      return await DirectMessagingModule.getContactName(phoneNumber);
    } catch (error) {
      console.warn('Error getting contact name', error);
      return phoneNumber;
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const convs = await DirectMessagingModule.getAllConversations();
      const convsWithNames = await Promise.all(
        convs.map(async (conv) => {
          const name = await getContactName(conv.address);
          return { ...conv, name };
        })
      );
      setConversations(convsWithNames);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      console.log("All coversation loaded")
      const intervalId = setInterval(()=>{
        loadConversations()
      console.log("All coversation loaded")
      }, 5000);

      return () => clearInterval(intervalId);
    }, [loadConversations])
  );

  const toggleModal = () => {
    setSearchQuery('');
    setFilteredContacts([]);
    setModalVisible(!isModalVisible);
  };

// ///
//   const normalizeNumber = (number) => {
//   let cleaned = number.replace(/\D/g, ''); // Remove non-digit characters

//   if (cleaned.length === 10) {
//     return `+91${cleaned}`;
//   } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
//     return `+${cleaned}`;
//   } else if (number.startsWith('+')) {
//     return number;
//   }

//   return `+${cleaned}`; // Fallback
// };
// //

const normalizeNumber = (number) => {
  const trimmed = number.trim();

  if (trimmed.startsWith('+')) {
    // Keep '+' and remove all other non-digits
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  const cleaned = trimmed.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`; // Fallback
};


 const startCustomChat = async () => {
  if (!customNumber.trim()) return;

  const normalized = normalizeNumber(customNumber);
  const name = await getContactName(normalized);

  navigation.navigate('Thread', {
    address: normalized,
    item: { name },
  });

  setCustomNumber('');
  toggleModal();
};

  const selectContact = (contact) => {
    const number = contact.phoneNumbers[0]?.number.replace(/\s/g, '');
    navigation.navigate('Thread', {
      address: number,
      item: { name: contact.displayName },
    });
    toggleModal();
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setFilteredContacts([]);
      return;
    }

    try {
      setContactSearchLoading(true);
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        const allContacts = await Contacts.getAllWithoutPhotos();
        const filtered = allContacts
          .filter(c => c.phoneNumbers.length > 0)
          .filter(c =>
            c.displayName.toLowerCase().includes(text.toLowerCase())
          );
        setFilteredContacts(filtered);
      }
    } catch (error) {
      console.warn('Error searching contacts:', error);
    } finally {
      setContactSearchLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Thread', { address: item.address, item })}
    >
      <Text style={styles.contactName}>{item.name}</Text>
      <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#128C7E" />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={item => item.threadId}
          ListEmptyComponent={<Text>No conversations found</Text>}
        />
      )}

      <TouchableOpacity style={styles.floatingButton} onPress={toggleModal}>
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal isVisible={isModalVisible} onBackdropPress={toggleModal} style={{ margin: 0, justifyContent: 'flex-end' }}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Start New Conversation</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor={"#000"}
            value={customNumber}
            onChangeText={setCustomNumber}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.modalButton} onPress={startCustomChat}>
            <Text style={styles.modalButtonText}>Start Messaging</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.searchBar}
            placeholder="Search contacts..."
            placeholderTextColor={"#000"}
            value={searchQuery}
            onChangeText={handleSearch}
          />

          <ScrollView style={styles.contactList}>
            {contactSearchLoading ? (
              <ActivityIndicator size="small" color="#128C7E" />
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.contactItem}
                  onPress={() => selectContact(contact)}
                >
                  <Text style={styles.contactName}>{contact.displayName}</Text>
                  <Text style={styles.contactNumber}>{contact.phoneNumbers[0]?.number}</Text>
                </TouchableOpacity>
              ))
            ) : searchQuery.length >= 2 ? (
              <Text style={{ color: '#999', paddingVertical: 10 }}>No matching contacts</Text>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  conversationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactName: { fontSize: 16, fontWeight: '600' },
  lastMessage: { fontSize: 14, color: '#666', marginVertical: 4 },
  timestamp: { fontSize: 12, color: '#999' },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#128C7E',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: '#128C7E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  contactList: { width: '100%' },
  contactItem: {
    paddingVertical: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  contactNumber: { color: '#666', fontSize: 12 },
});

export default AllConversations;



//////////////dome

////working done 