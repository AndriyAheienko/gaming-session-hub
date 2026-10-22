import { Gamepad2, User, Bell, Users } from 'lucide-react';

export const navItems = [
    { path: '/', label: 'Sessions', icon: <Gamepad2 size={24} /> },
    { path: '/profile', label: 'Profile', icon: <User size={24} /> },
    { path: '/friends', label: 'Friends', icon: <Users size={24} /> },
    { path: '/notifications', label: 'Notifications', icon: <Bell size={24} /> },
];
