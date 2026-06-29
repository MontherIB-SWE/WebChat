
# 💬 WebChat

A real-time chat application built with **React** and **Firebase**, featuring slash commands, emoji reactions, and a responsive mobile UI.

**Live:** https://webchat-1185b.web.app

<!-- 👇 A short screen-recording GIF of sending a message + a reaction sells this instantly. -->
<!-- ![Demo](docs/demo.gif) -->
<img width="1920" height="1009" alt="webchat" src="https://github.com/user-attachments/assets/2be3f85d-b49b-4f1a-8191-d4aa98d60e0d" />

## ✨ Features
- ⚡ Real-time messaging — messages sync live across all clients via Firestore (`onSnapshot`)
- 🌍 Instant join — pick a username and start chatting, no signup required (global public room)
- ⌨️ Slash commands — `/wave`, `/celebrate`, `/coffee`, `/love`, and more trigger fun emoji actions
- 😀 Emoji reactions — react to any message (👍 ❤️ 😂 😮 🎉) with live reaction counts
- 📱 Responsive, mobile-friendly UI

## 🛠️ Tech Stack
**Frontend:** React 18 · react-icons · CSS
**Realtime data:** Firebase Firestore

## 🚀 Getting Started
```bash
npm install
npm start            # add your Firebase config to a .env file
```
**Live demo:** https://webchat-1185b.web.app

## 📚 What I learned
Building a genuinely real-time UI with Firestore's onSnapshot listeners, so every client stays in sync without polling or page refreshes. I also designed a frictionless, no-login "global room" flow, modeled message reactions and slash-command actions as Firestore documents, and learned to deploy and host a single-page React app on Firebase Hosting.
---
Built by [Monther Ibrahem](https://montherib-swe.github.io/) · [LinkedIn](https://www.linkedin.com/in/mibrahem1)
