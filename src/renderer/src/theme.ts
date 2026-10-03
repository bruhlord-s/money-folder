import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/** Aura with an orange primary on cream / light-yellow surfaces. Light mode only for now. */
export const warmPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{orange.50}',
      100: '{orange.100}',
      200: '{orange.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}'
    },
    colorScheme: {
      light: {
        primary: {
          // One step darker than Aura's default so white button text stays readable.
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}'
        },
        surface: {
          0: '#ffffff',
          50: '#fffcf2',
          100: '#fef6dc',
          200: '#f8ebc4',
          300: '#ecdcaa',
          400: '#cdb98a',
          500: '#a8946c',
          600: '#857353',
          700: '#655740',
          800: '#463c2d',
          900: '#2e271e',
          950: '#1c1812'
        }
      }
    }
  }
})
