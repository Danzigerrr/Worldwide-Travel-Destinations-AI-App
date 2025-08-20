// components/Navbar.js
"use client";

import { useContext } from 'react';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import Link from 'next/link';
import AuthContext from '../context/AuthContext';

export default function AppNavbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="/">Travel App</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav>
            {user && (
              <>
                <Nav.Link as={Link} href="/destinations">Destinations</Nav.Link>
                <Nav.Link as={Link} href="/chat">Chat</Nav.Link>
              </>
            )}
          </Nav>
          <Nav className="ms-auto">
            {user ? (
              <>
                <span className="navbar-text me-3">Hello, {user.username}</span>
                <Button variant="outline-light" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <Nav.Link as={Link} href="/login">Login</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}