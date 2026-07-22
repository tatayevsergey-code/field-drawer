import { useState, useCallback } from 'react';

/**
 * @typedef {Object} FieldData
 * @property {string} name
 * @property {string} cropType
 * @property {number} area
 * @property {string} soilType
 * @property {string} notes
 */

/**
 * @typedef {Object} Field
 * @property {number} id
 * @property {number[][]} coordinates
 * @property {FieldData} data
 * @property {Date} createdAt
 */

/**
 * Хук управления списком полей
 * @returns {{fields: Field[], addField: Function, updateField: Function, deleteField: Function}}
 */
export function useFields() {
    const [fields, setFields] = useState(/** @type {Field[]} */ ([]));

    const addField = useCallback((coordinates, data) => {
        const newField = {
            id: Date.now(),
            coordinates,
            data,
            createdAt: new Date()
        };
        setFields(prev => [...prev, newField]);
    }, []);

    const updateField = useCallback((id, newData) => {
        setFields(prev => prev.map(f =>
            f.id === id ? { ...f, data: newData } : f
        ));
    }, []);

    const deleteField = useCallback((id) => {
        setFields(prev => prev.filter(f => f.id !== id));
    }, []);

    return { fields, addField, updateField, deleteField };
}