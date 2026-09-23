import { HackathonPhaseDTO } from '@/types/config';
import { ConfigurationKey } from './configurationKey'

function getDefaultPhases() {
  const phaseNames = [
    'Complétion de Profil',
    'Sélection du Sujet',
    'Formation des Équipes',
    'Hackathon',
    'Évaluation & Feedback',
    'Clôture & Annonces',
  ];

  const phases = phaseNames.map((name, index) => {
    const order = index + 1;

    const status = (order === 1) ? 'PENDING' : 'NOT_STARTED';

    const optional = [3, 5, 6].includes(order);

    const phase: HackathonPhaseDTO = {
      order: order,
      name: name,
      status: status,
      optionalPhase: optional,
      startDate: null,
      endDate: null,
    };

    if (order === 4) {
      const today = new Date();
      const defaultDeadline = new Date(today.getFullYear() + 1, 11, 1).toISOString();
      phase.endDate = defaultDeadline;
    }
    return phase;
  });

  return phases;
}

export const defaultConfigurations = {
  [ConfigurationKey.LEGAL]: {
    terms: [
      {
        id: 'introduction',
        title: { en: 'Introduction', fr: 'Introduction' },
        content: {
          en: 'Describe the purpose of the terms and conditions.',
          fr: "Décrivez l'objet des conditions générales.",
        },
        isDefault: true,
      },
      {
        id: 'site_access',
        title: { en: 'Site Access', fr: 'Accès au site' },
        content: {
          en: 'Conditions for accessing and using the site.',
          fr: "Conditions d'accès et d'utilisation du site.",
        },
        isDefault: true,
      },
      {
        id: 'intellectual_property',
        title: { en: 'Intellectual Property', fr: 'Propriété intellectuelle' },
        content: {
          en: 'Specify who owns copyrights and trademarks.',
          fr: "Précisez qui possède les droits d'auteur et les marques.",
        },
        isDefault: true,
      },
      {
        id: 'responsibilities',
        title: { en: 'Responsibilities', fr: 'Responsabilités' },
        content: {
          en: 'Specify your responsibilities and those of the user.',
          fr: "Précisez vos responsabilités et celles de l'utilisateur.",
        },
        isDefault: true,
      },
      {
        id: 'limitation_of_liability',
        title: { en: 'Limitation of Liability', fr: 'Limitation de responsabilité' },
        content: {
          en: 'Specify the limits of your liability.',
          fr: 'Précisez les limites de votre responsabilité.',
        },
        isDefault: true,
      },
      {
        id: 'applicable_law',
        title: { en: 'Applicable Law', fr: 'Droit applicable' },
        content: {
          en: 'Mention applicable law and jurisdiction.',
          fr: 'Mentionnez le droit applicable et la juridiction compétente.',
        },
        isDefault: true,
      },
      {
        id: 'contact',
        title: { en: 'Contact', fr: 'Contact' },
        content: {
          en: 'Explain how to contact the team.',
          fr: "Expliquez comment contacter l'équipe.",
        },
        isDefault: true,
      },
    ],
    privacy: [
      {
        id: 'introduction',
        title: { en: 'Introduction', fr: 'Introduction' },
        content: {
          en: 'Present your privacy policy.',
          fr: 'Présentez votre politique de confidentialité.',
        },
        isDefault: true,
      },
      {
        id: 'data_collected',
        title: { en: 'Data Collected', fr: 'Données collectées' },
        content: {
          en: 'Specify what personal data you collect.',
          fr: 'Précisez quelles données personnelles vous collectez.',
        },
        isDefault: true,
      },
      {
        id: 'purpose_of_processing',
        title: { en: 'Purpose of Processing', fr: 'Finalité du traitement' },
        content: {
          en: 'Explain why you collect this data.',
          fr: 'Expliquez pourquoi vous collectez ces données.',
        },
        isDefault: true,
      },
      {
        id: 'data_sharing',
        title: { en: 'Data Sharing', fr: 'Partage des données' },
        content: {
          en: 'Specify if you share data with third parties.',
          fr: 'Précisez si vous partagez des données avec des tiers.',
        },
        isDefault: true,
      },
      {
        id: 'data_retention',
        title: { en: 'Data Retention', fr: 'Conservation des données' },
        content: {
          en: 'Indicate how long data is retained.',
          fr: 'Indiquez combien de temps les données sont conservées.',
        },
        isDefault: true,
      },
      {
        id: 'user_rights',
        title: { en: 'User Rights', fr: "Droits de l'utilisateur" },
        content: {
          en: 'Explain rights (access, deletion, etc.)',
          fr: 'Expliquez les droits (accès, suppression, etc.)',
        },
        isDefault: true,
      },
      {
        id: 'cookies',
        title: { en: 'Cookies', fr: 'Cookies' },
        content: {
          en: 'Explain use of cookies and how to refuse them.',
          fr: "Expliquez l'utilisation des cookies et comment les refuser.",
        },
        isDefault: true,
      },
      {
        id: 'contact',
        title: { en: 'Contact', fr: 'Contact' },
        content: {
          en: 'Provide an email for exercising rights.',
          fr: 'Fournissez un email pour exercer vos droits.',
        },
        isDefault: true,
      },
    ],
  },
  [ConfigurationKey.MEDIA]: {
    instagram: null,
    facebook: null,
    linkedin: null,
    x: null,
    youtube: null,
    bannerPictureId: null,
    hackathonLogoId: null,
    evaluationGridPath: null,
  },
  [ConfigurationKey.TEXTS]: {
    hackathonName: '',
    slogan: '',
    hackathonDescription: '',
    location: '',
    startDate: '',
    endDate: '',
  },
  [ConfigurationKey.PHASES]: {
    phases: getDefaultPhases(),
  },
  [ConfigurationKey.PARTNERS]: [],
  [ConfigurationKey.MATCHMAKING]: {
    isActive: false,
    teamSizeMin: 1,
    teamSizeMax: 1,
    maxTeamsPerSubject: 2,
    maxTeamsPerTopic: 2,
    algorithm: 'new',
    constraints: [],
  },
  [ConfigurationKey.THEMES]: [],
  [ConfigurationKey.MAILING]: {
    firstConnectionTemplate: {
      object: 'Welcome to {{hackathonName}}!',
      title: 'Welcome to {{hackathonName}}',
      introParagraph: 'You are invited to participate in {{hackathonName}}. We are excited to have you on board!',
      actionPrompt: 'To confirm your participation and access your account, please click the button below:',
      buttonText: 'Access to my account',
      closingNote: 'If you did not request a new connection to your account, please ignore this email.',
      signatureSalutation: 'Best regards,',
      signatureName: 'The {{hackathonName}} Team',
    },
    passwordResetTemplate: {
      object: 'Password Reset Request for {{hackathonName}}',
      title: 'Password Reset Request',
      introParagraph: 'We received a request to reset your password for your account at {{hackathonName}}.',
      actionPrompt: 'To reset your password, please click the button below:',
      buttonText: 'Reset My Password',
      closingNote: 'If you did not request a password reset, please ignore this email.',
      signatureSalutation: 'Best regards,',
      signatureName: 'The {{hackathonName}} Team',
    },
  },
}
