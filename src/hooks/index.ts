// Granular hooks — focused slices of AppContext for cleaner page imports.

import { useApp } from '../context/AppContext'

export function useAuth() {
  const a = useApp()
  return {
    user: a.user,
    profile: a.profile,
    loading: a.authLoading,
    needsSetup: a.needsSetup,
    signIn: a.signIn,
    signUp: a.signUp,
    signOut: a.signOut,
    changePassword: a.changePassword,
    createProfile: a.createProfile,
    updateProfile: a.updateProfile,
  }
}

export function useAccount() {
  const a = useApp()
  return {
    activeUserId: a.activeUserId,
    activeProfile: a.activeProfile,
    isManagingOther: a.isManagingOther,
    managedAccounts: a.managedAccounts,
    teamMembers: a.teamMembers,
    switchAccount: a.switchAccount,
    inviteTeamMember: a.inviteTeamMember,
    removeTeamMember: a.removeTeamMember,
    refetch: a.refetchAccount,
    loading: a.dataLoading,
    error: a.dataError,
  }
}

export function useBookings() {
  const a = useApp()
  return {
    bookings: a.account.bookings,
    loading: a.dataLoading,
    error: a.dataError,
    confirm: a.confirmBooking,
    cancel: a.cancelBooking,
    reschedule: a.rescheduleBooking,
    setComment: a.setBookingComment,
    setStudents: a.setBookingStudents,
    refetch: a.refetchAccount,
  }
}

export function useSlots() {
  const a = useApp()
  return {
    slots: a.account.slots,
    slotConfigs: a.account.slotConfigs,
    loading: a.dataLoading,
    error: a.dataError,
    generate: a.generateSlots,
    remove: a.deleteSlot,
    clearAll: a.clearAllSlots,
    getAvailableDates: a.getAvailableDates,
    getAvailableSlots: a.getAvailableSlots,
  }
}

export function useEventTypes() {
  const a = useApp()
  return {
    types: a.account.calendarTypes,
    loading: a.dataLoading,
    error: a.dataError,
    create: a.createCalendarType,
    remove: a.deleteCalendarType,
  }
}

export function useSettings() {
  const a = useApp()
  return {
    settings: a.account.settings,
    save: a.saveSettings,
  }
}
