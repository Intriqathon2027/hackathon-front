import UserLayout from '@/layouts/UserLayout.vue'
import Dashboard from '@/pages/common/Dashboard.vue'
import Team from '@/pages/user/Team.vue'
import Project from '@/pages/user/Project.vue'
import SubjectRanking from '@/pages/user/SubjectRanking.vue'
import FAQ from '@/pages/common/FAQ.vue'
import Profile from '@/pages/common/Profile.vue'
import Announcements from '@/pages/common/Announcements.vue'
import { UserRole } from '@/types/roles'

export default [
  {
    path: '/user',
    component: UserLayout,
    children: [
      {
        path: '',
        redirect: { name: 'UserDashboard' }
      },
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: Dashboard,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'announcements',
        name: 'UserAnnouncements',
        component: Announcements,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'team',
        name: 'TeamPage',
        component: Team,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'project',
        name: 'ProjectPage',
        component: Project,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'subject-ranking',
        name: 'SubjectRankingPage',
        component: SubjectRanking,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'faq',
        name: 'FaqPage',
        component: FAQ,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
      {
        path: 'profile',
        name: 'ProfilePage',
        component: Profile,
        meta: { requiresAuth: true, role: UserRole.PARTICIPANT },
      },
    ],
  },
]
