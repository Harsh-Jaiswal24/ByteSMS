import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import AllConversations from './Screen/AllConversations';
import ThreadView from './Screen/ThreadView';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Conversations">
        <Stack.Screen name="Conversations" component={AllConversations} options={{title:'ByteSMS'}}/>
        <Stack.Screen name="Thread" component={ThreadView}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;