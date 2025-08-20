"use client";

import { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Form, Button, Card, ListGroup, InputGroup, Spinner } from 'react-bootstrap';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


export default function ChatPage() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [chatId, setChatId] = useState(null);
    const [userChats, setUserChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Get the chat ID from the URL on initial load
    useEffect(() => {
        const urlChatId = searchParams.get('id');
        if (urlChatId) {
            setChatId(urlChatId);
        }
    }, [searchParams]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch user's chat list
    useEffect(() => {
        const fetchChats = async () => {
            if (user) {
                setIsLoadingChats(true);
                try {
                    const response = await axios.get(`http://localhost:8000/chat/users/${user.id}/chats/`);
                    setUserChats(response.data);
                } catch (error) {
                    console.error('Failed to fetch user chats:', error);
                } finally {
                    setIsLoadingChats(false);
                }
            }
        };
        fetchChats();
    }, [user]);

    // Fetch chat history for the selected chat ID
    useEffect(() => {
        const fetchHistory = async () => {
            if (chatId) {
                setIsLoadingHistory(true);
                try {
                    const response = await axios.get(`http://localhost:8000/chat/${chatId}`);
                    setMessages(response.data.history);
                } catch (error) {
                    console.error('Failed to fetch chat history:', error);
                    setMessages([]);
                } finally {
                    setIsLoadingHistory(false);
                }
            } else {
                setMessages([]);
            }
        };
        fetchHistory();
    }, [chatId]);

    const handleNewChat = async () => {
        try {
            const response = await axios.post('http://localhost:8000/chat/chats/', { user_id: user.id });
            const newChatId = response.data.id;
            setChatId(newChatId);
            router.push(`/chat?id=${newChatId}`);
            setMessages([]);
        } catch (error) {
            console.error('Failed to create new chat:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !user || isSending) return;

        setIsSending(true);
        const newMessage = { role: 'human', content: input };
        setMessages(prev => [...prev, newMessage]);
        setInput('');

        try {
            const response = await axios.post('http://localhost:8000/chat/', {
                prompt: input,
                chat_id: chatId,
                user_id: user.id,
            });

            // Update state with the full conversation from the API response
            const newAiMessage = { role: 'ai', content: response.data.message, sources: response.data.sources };
            setMessages(prev => [...prev.filter(msg => msg.role !== 'temp'), newAiMessage]);

            // Re-fetch history to ensure state is synchronized with the backend
            const historyResponse = await axios.get(`http://localhost:8000/chat/${response.data.chat_id}`);
            setMessages(historyResponse.data.history);

            setChatId(response.data.chat_id);
            router.push(`/chat?id=${response.data.chat_id}`, undefined, { shallow: true });

        } catch (error) {
            console.error('Failed to send message:', error);
            // Revert temporary message on error
            setMessages(prev => prev.filter(msg => msg.role !== 'temp'));
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectChat = (selectedChatId) => {
        setChatId(selectedChatId);
        router.push(`/chat?id=${selectedChatId}`);
    };

    if (authLoading || !user) {
        return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;
    }

    return (
        <Container fluid className="vh-100 d-flex flex-column">
            <Row className="flex-grow-1">
                {/* Sidebar for Chat List */}
                <Col md={3} className="bg-light border-end d-flex flex-column p-0">
                    <Card.Header className="text-center p-3">
                        <Button variant="primary" className="w-100" onClick={handleNewChat}>
                            + New Chat
                        </Button>
                    </Card.Header>
                    <div className="flex-grow-1 overflow-auto">
                        {isLoadingChats ? (
                             <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
                        ) : (
                            <ListGroup variant="flush">
                                {userChats.map(chat => (
                                    <ListGroup.Item
                                        key={chat.id}
                                        action
                                        onClick={() => handleSelectChat(chat.id)}
                                        active={chat.id === chatId}
                                        className="py-3 px-4"
                                    >
                                        Chat - {new Date(chat.updated_at).toLocaleDateString()}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}
                    </div>
                </Col>

                {/* Main Chat Window */}
                <Col md={9} className="d-flex flex-column p-0">
                    <Card className="flex-grow-1 border-0 rounded-0">
                        <Card.Header className="bg-dark text-white p-3">
                           {chatId ? `Chat Session: ${chatId.substring(0, 8)}...` : 'Select a Chat or Start a New One'}
                        </Card.Header>
                        <Card.Body className="overflow-auto" style={{ maxHeight: '70vh' }}>
                            {isLoadingHistory ? (
                                <div className="text-center mt-5"><Spinner animation="border" /></div>
                            ) : (
                                <div className="d-flex flex-column">
                                    {messages.length === 0 && !isLoadingHistory && (
                                        <p className="text-center text-muted mt-5">No messages in this chat. Start a conversation!</p>
                                    )}
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`d-flex ${msg.role === 'human' ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <div
                                                className={`p-3 my-2 rounded-3 text-break ${
                                                    msg.role === 'human'
                                                        ? 'bg-primary text-white'
                                                        : 'bg-light border'
                                                }`}
                                                style={{ maxWidth: '75%' }}
                                            >
                                                <small className="text-muted">{msg.role === 'human' ? 'You' : 'AI'}</small>
                                                
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                                 
                                                {/* Check if sources exist and are a non-empty string */}
                                                {msg.role === 'ai' && msg.sources && typeof msg.sources === 'string' && msg.sources.trim().length > 0 && (
                                                    <div className="mt-2">
                                                        <small className="text-muted">Sources:</small>
                                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                                            {/* Split the string by newline and map over each source line */}
                                                            {msg.sources.split('\n').map((sourceLine, sourceIndex) => {
                                                                // Regular expression to extract the city_name and id
                                                                const match = sourceLine.match(/id=([a-f0-9-]+), city_name=(.*)\)/);

                                                                if (match) {
                                                                    const id = match[1];
                                                                    const city_name = match[2];

                                                                    return (
                                                                        <Button
                                                                            key={sourceIndex}
                                                                            variant="outline-secondary"
                                                                            size="sm"
                                                                            href={`/destinations/${id}`}
                                                                            className="text-nowrap"
                                                                            target="_blank"
                                                                        >
                                                                            {city_name}
                                                                        </Button>
                                                                    );
                                                                }
                                                                return null; // Don't render anything for non-matching lines
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                        <Card.Footer className="bg-white p-3 border-top">
                            <Form onSubmit={handleSendMessage}>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Type your message here..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={isSending || !user}
                                    />
                                    <Button variant="success" type="submit" disabled={isSending || !user}>
                                        {isSending ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            'Send'
                                        )}
                                    </Button>
                                </InputGroup>
                            </Form>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}