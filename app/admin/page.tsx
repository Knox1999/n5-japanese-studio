import type { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';
import '@/styles/admin-entry.scss';

export const metadata:Metadata={title:'Account Administration',robots:{index:false,follow:false,nocache:true}};

export default function AdminPage(){
  return <AdminPanel/>;
}
