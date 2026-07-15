import { useContext } from 'react';
import { CRMContext } from '../context/CRMContext';

export const useCRM = () => useContext(CRMContext);
