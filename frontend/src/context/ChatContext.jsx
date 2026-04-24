import React, { createContext, useState, useEffect, useContext } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    // Initialize messages from sessionStorage if available, otherwise default greeting
    const [messages, setMessages] = useState(() => {
        const savedMessages = sessionStorage.getItem('aiTutorMessages');
        return savedMessages ? JSON.parse(savedMessages) : [
            { role: 'assistant', content: "Hi! I'm your AI Tutor. How can I help you today?" }
        ];
    });

    const [isLoading, setIsLoading] = useState(false);

    // Persist messages to sessionStorage whenever they change
    useEffect(() => {
        sessionStorage.setItem('aiTutorMessages', JSON.stringify(messages));
    }, [messages]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const clearChat = () => {
        const defaultMessage = [{ role: 'assistant', content: "Hi! I'm your AI Tutor. How can I help you today?" }];
        setMessages(defaultMessage);
        sessionStorage.setItem('aiTutorMessages', JSON.stringify(defaultMessage));
    };

    return (
        <ChatContext.Provider value={{
            messages,
            setMessages,
            isLoading,
            setIsLoading,
            addMessage,
            clearChat
        }}>
            {children}
        </ChatContext.Provider>
    );
};
