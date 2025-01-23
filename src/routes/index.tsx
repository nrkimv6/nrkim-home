import React from 'react';
import { RouteObject } from 'react-router-dom';
import AIFC01 from '../pages/AIFC01';
import AIFStudy from '../pages/AIFStudy';
import HomeScreen from '../components/HomeScreen'

interface RouteConfig {
  path: string;
  element: React.ReactNode;
  title: string;
  visible?: boolean;  // 네비게이션 표시 여부
  children?: RouteConfig[];
}

export const aifRoutes: RouteConfig[] = [
  {
    path: '/aif-c01',
    element: <AIFC01 />,
    title: '메인',
    visible: false
  },
  {
    path: '/aif-c01/study',
    element: <AIFStudy />,
    title: '학습하기',
    visible: false
  }
];

export const routes: RouteConfig[] = [
  {
    path: '/',
    element: <HomeScreen />,
    title: 'Home',
    visible: false  // 네비게이션에 표시하지 않음
  },
  ...aifRoutes
];

export default function Index() {
  return (
    <HomeScreen />
  )
} 