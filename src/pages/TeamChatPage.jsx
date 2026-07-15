import React from 'react';
import TeamChat from '../components/TeamChat';
import { useCRM } from '../hooks/useCRM';

export default function TeamChatPage() {
    const { chats, purchaseOrders, userRole, handleAddChatMessage, handleAddActivity } = useCRM();

    return (
        <TeamChat
            chats={chats}
            purchaseOrders={purchaseOrders}
            userRole={userRole}
            onAddChatMessage={handleAddChatMessage}
            onAddActivity={handleAddActivity}
        />
    );
}
