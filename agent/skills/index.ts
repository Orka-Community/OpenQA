import { OpenQADatabase } from '../../database/index.js';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'directive' | 'test-scenario' | 'custom-check' | 'workflow';
  enabled: boolean;
  priority: number;
  prompt: string;
  triggers?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillExecution {
  skillId: string;
  sessionId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: string;
}

const DEFAULT_SKILLS: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'GDPR Compliance Check',
    description: 'Check for GDPR compliance (cookie consent, privacy policy, data handling)',
    type: 'custom-check',
    enabled: true,
    priority: 1,
    prompt: `Check GDPR compliance:
- Verify cookie consent banner exists and works
- Check for privacy policy link
- Verify data deletion/export options if user accounts exist
- Check for proper consent checkboxes on forms
- Report any GDPR violations`,
    triggers: ['eu', 'gdpr', 'privacy', 'cookies']
  },
  {
    name: 'Mobile Responsiveness',
    description: 'Test application on mobile viewport sizes',
    type: 'test-scenario',
    enabled: true,
    priority: 2,
    prompt: `Test mobile responsiveness:
- Test at 375px width (iPhone)
- Test at 768px width (tablet)
- Check for horizontal scrolling issues
- Verify touch targets are large enough
- Check navigation menu behavior on mobile
- Report any responsive design issues`,
    triggers: ['mobile', 'responsive', 'viewport']
  },
  {
    name: 'E-commerce Flow',
    description: 'Test complete e-commerce purchase flow',
    type: 'workflow',
    enabled: false,
    priority: 3,
    prompt: `Test e-commerce flow:
- Browse products
- Add items to cart
- Verify cart updates correctly
- Test checkout process
- Test payment form validation
- Verify order confirmation
- Report any issues in the purchase flow`,
    triggers: ['shop', 'cart', 'checkout', 'payment', 'ecommerce']
  },
  {
    name: 'Dark Mode Testing',
    description: 'Test dark mode if available',
    type: 'custom-check',
    enabled: true,
    priority: 4,
    prompt: `Test dark mode:
- Look for dark mode toggle
- Switch between light and dark modes
- Check for contrast issues in dark mode
- Verify all text is readable
- Check images and icons visibility
- Report any dark mode specific bugs`,
    triggers: ['dark', 'theme', 'mode']
  },
  {
    name: 'Error Handling',
    description: 'Test application error handling',
    type: 'test-scenario',
    enabled: true,
    priority: 1,
    prompt: `Test error handling:
- Try accessing non-existent pages (404)
- Submit forms with invalid data
- Test with network errors (if possible)
- Check error message clarity
- Verify errors don't expose sensitive info
- Test recovery from error states
- Report poor error handling`,
    triggers: ['error', '404', 'exception']
  },
  {
    name: 'Rate Limiting Check',
    description: 'Test for rate limiting on sensitive endpoints',
    type: 'custom-check',
    enabled: true,
    priority: 2,
    prompt: `Test rate limiting:
- Attempt multiple rapid login attempts
- Test API endpoints for rate limiting
- Check for CAPTCHA on repeated failures
- Verify account lockout mechanisms
- Report missing rate limiting as security issue`,
    triggers: ['rate', 'limit', 'brute', 'ddos']
  }
];

export class SkillManager {
  private db: OpenQADatabase;
  private skills: Map<string, Skill> = new Map();

  constructor(db: OpenQADatabase) {
    this.db = db;
    this.loadSkills();
  }

  private loadSkills() {
    // Load default skills synchronously to avoid async issues
    DEFAULT_SKILLS.forEach(skill => {
      this.createSkill(skill);
    });
  }

  private saveSkills() {
    // Skills are stored in memory only for now
    // TODO: Implement async persistence when needed
  }

  createSkill(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const skill: Skill = {
      ...data,
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.skills.set(skill.id, skill);
    this.saveSkills();
    
    return skill;
  }

  updateSkill(id: string, updates: Partial<Omit<Skill, 'id' | 'createdAt'>>): Skill | null {
    const skill = this.skills.get(id);
    if (!skill) return null;

    const updated: Skill = {
      ...skill,
      ...updates,
      updatedAt: new Date()
    };

    this.skills.set(id, updated);
    this.saveSkills();
    
    return updated;
  }

  deleteSkill(id: string): boolean {
    const deleted = this.skills.delete(id);
    if (deleted) {
      this.saveSkills();
    }
    return deleted;
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getEnabledSkills(): Skill[] {
    return this.getAllSkills()
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  getSkillsByType(type: Skill['type']): Skill[] {
    return this.getAllSkills().filter(s => s.type === type);
  }

  findSkillsByTrigger(text: string): Skill[] {
    const lowerText = text.toLowerCase();
    return this.getEnabledSkills().filter(skill => 
      skill.triggers?.some(trigger => lowerText.includes(trigger.toLowerCase()))
    );
  }

  generateSkillPrompt(skills: Skill[]): string {
    if (skills.length === 0) return '';

    const skillInstructions = skills.map((skill, index) => 
      `### Skill ${index + 1}: ${skill.name}\n${skill.prompt}`
    ).join('\n\n');

    return `
## Additional Skills/Directives to Follow

The following skills have been configured. Execute them as part of your testing:

${skillInstructions}

Remember to report findings from each skill separately.
`;
  }

  toggleSkill(id: string): Skill | null {
    const skill = this.skills.get(id);
    if (!skill) return null;

    return this.updateSkill(id, { enabled: !skill.enabled });
  }

  reorderSkills(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const skill = this.skills.get(id);
      if (skill) {
        skill.priority = index + 1;
        skill.updatedAt = new Date();
      }
    });
    this.saveSkills();
  }

  exportSkills(): string {
    return JSON.stringify(this.getAllSkills(), null, 2);
  }

  importSkills(json: string): number {
    const imported = JSON.parse(json) as Skill[];
    let count = 0;

    imported.forEach(skill => {
      const newSkill = this.createSkill({
        name: skill.name,
        description: skill.description,
        type: skill.type,
        enabled: skill.enabled,
        priority: skill.priority,
        prompt: skill.prompt,
        triggers: skill.triggers
      });
      if (newSkill) count++;
    });

    return count;
  }
}
