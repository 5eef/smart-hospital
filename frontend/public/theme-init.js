try {
  const savedTheme = localStorage.getItem('smartHospitalTheme')
  const dark = savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
} catch {
  // Theme initialization is optional and contains no sensitive state.
}
