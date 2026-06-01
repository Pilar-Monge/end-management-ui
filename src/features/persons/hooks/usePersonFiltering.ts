import { useMemo, useState } from 'react'
import type { Person, PersonStatus } from '../types'

export const STATUS_OPTIONS: Array<PersonStatus | 'ALL'> = [
  'ALL',
  'ACTIVE',
  'INJURED',
  'OUTSIDE_CAMP',
  'INACTIVE',
]

export function usePersonFiltering(persons: Person[]) {
  const [filterStatus, setFilterStatus] = useState<PersonStatus | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPersons = useMemo(() => {
    let result = persons

    if (filterStatus !== 'ALL') {
      result = result.filter((person: Person) => person.status === filterStatus)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (person: Person) =>
          person.firstName.toLowerCase().includes(term) ||
          person.lastName.toLowerCase().includes(term) ||
          person.alias?.toLowerCase().includes(term),
      )
    }

    return result
  }, [persons, filterStatus, searchTerm])

  return {
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    filteredPersons,
  }
}
