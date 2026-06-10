import { describe, it, expect } from 'vitest';
import {
  calculateIndustrialScore,
  validateStructureWeights,
  validateSectionWeights,
  compileFinalPercent
} from './grading-service';
import type {
  GradingStructure,
  StructureWeights,
  SectionWeights,
  CriterionRating,
  DepartmentGradingConfig,
  CompiledGradeComponents
} from '../types/grading';

describe('Grading Service - Unit Tests', () => {
  describe('compileFinalPercent', () => {
    const baseConfig: DepartmentGradingConfig = {
      id: 'cfg-1',
      departmentId: 'CS',
      termId: 't1',
      structure: 'A',
      structureWeights: { w1: 40, w2: 30, w3: 30 },
      sectionWeights: { a: 25, b: 25, c: 25, d: 25 },
      status: 'active',
      createdBy: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
      updatedBy: 'admin',
      updatedAt: '2026-01-01T00:00:00Z'
    };

    it('should correctly compile score for Structure A', () => {
      const config = { ...baseConfig, structure: 'A' as const, structureWeights: { w1: 40, w2: 30, w3: 30 } };
      const components: CompiledGradeComponents = {
        industrial: 80,
        departmental: 90,
        report: 70
      };
      // 80*0.4 + 90*0.3 + 70*0.3 = 32 + 27 + 21 = 80
      expect(compileFinalPercent(components, config)).toBe(80);
    });

    it('should correctly compile score for Structure C (4-component)', () => {
      const config = { ...baseConfig, structure: 'C' as const, structureWeights: { w1: 40, w2: 30, w3: 15, w4: 15 } };
      const components: CompiledGradeComponents = {
        industrial: 100,
        departmental: 100,
        report: 100,
        presentation: 100
      };
      expect(compileFinalPercent(components, config)).toBe(100);
    });

    it('should return null if any required component is missing', () => {
      const config = { ...baseConfig, structure: 'A' as const };
      const components: CompiledGradeComponents = {
        industrial: 80,
        departmental: 90
        // report is missing
      };
      expect(compileFinalPercent(components, config)).toBeNull();
    });

    it('should correctly compile score for Structure D with excluded components', () => {
      const config = { ...baseConfig, structure: 'D' as const, structureWeights: { w1: 50, w2: 50, w3: 0, w4: 0 } };
      const components: CompiledGradeComponents = {
        industrial: 80,
        departmental: 90
      };
      // w3 and w4 are 0, so report and presentation are not required
      // 80*0.5 + 90*0.5 = 40 + 45 = 85
      expect(compileFinalPercent(components, config)).toBe(85);
    });
  });

  describe('calculateIndustrialScore', () => {
    it('should correctly calculate the section-weighted industrial score', () => {
      // Mock ratings for all 18 criteria
      // All ratings are 5 (Outstanding), so the score should be 100
      const ratings: Record<string, CriterionRating> = {
        // Section A
        'tech_understanding_concepts': 5, 'tech_application_knowledge': 5, 'tech_problem_solving': 5,
        'tech_practical_skills': 5, 'tech_innovation': 5,
        // Section B
        'prof_communication': 5, 'prof_teamwork': 5, 'prof_initiative': 5,
        'prof_time_management': 5, 'prof_adaptability': 5,
        // Section C
        'eth_punctuality': 5, 'eth_reliability': 5, 'eth_responsibility': 5, 'eth_professionalism': 5,
        // Section D
        'overall_quality': 5, 'overall_quantity': 5, 'overall_improvement': 5, 'overall_recommendation': 5
      };

      const sectionWeights: SectionWeights = {
        a: 25, b: 25, c: 25, d: 25
      };

      const result = calculateIndustrialScore(ratings, sectionWeights);
      expect(result).toBe(100);
    });

    it('should correctly calculate score with varied ratings and weights', () => {
      // Ratings: Section A average = 3/5 (60%), B = 4/5 (80%), C = 2/5 (40%), D = 5/5 (100%)
      const ratings: Record<string, CriterionRating> = {
        // Section A
        'tech_understanding_concepts': 3, 'tech_application_knowledge': 3, 'tech_problem_solving': 3,
        'tech_practical_skills': 3, 'tech_innovation': 3,
        // Section B
        'prof_communication': 4, 'prof_teamwork': 4, 'prof_initiative': 4,
        'prof_time_management': 4, 'prof_adaptability': 4,
        // Section C
        'eth_punctuality': 2, 'eth_reliability': 2, 'eth_responsibility': 2, 'eth_professionalism': 2,
        // Section D
        'overall_quality': 5, 'overall_quantity': 5, 'overall_improvement': 5, 'overall_recommendation': 5
      };

      const sectionWeights: SectionWeights = {
        a: 40, b: 30, c: 20, d: 10
      };

      // A: 60% * 40 = 24
      // B: 80% * 30 = 24
      // C: 40% * 20 = 8
      // D: 100% * 10 = 10
      // Total: 24 + 24 + 8 + 10 = 66
      const result = calculateIndustrialScore(ratings, sectionWeights);
      expect(result).toBe(66);
    });
  });

  describe('validateStructureWeights', () => {
    it('should validate Structure A (3-component)', () => {
      const weights: StructureWeights = { w1: 40, w2: 30, w3: 30 };
      expect(validateStructureWeights('A', weights)).toBeNull();
    });

    it('should fail Structure A if sum is not 100', () => {
      const weights: StructureWeights = { w1: 40, w2: 30, w3: 20 };
      expect(validateStructureWeights('A', weights)).toContain('sum to exactly 100%');
    });

    it('should fail Structure A if w4 is present', () => {
      const weights: StructureWeights = { w1: 40, w2: 20, w3: 20, w4: 20 };
      expect(validateStructureWeights('A', weights)).toContain('should not include a 4th weight');
    });

    it('should validate Structure C (4-component)', () => {
      const weights: StructureWeights = { w1: 40, w2: 30, w3: 15, w4: 15 };
      expect(validateStructureWeights('C', weights)).toBeNull();
    });

    it('should validate Structure D (custom) with 0% components', () => {
      const weights: StructureWeights = { w1: 50, w2: 50, w3: 0, w4: 0 };
      expect(validateStructureWeights('D', weights)).toBeNull();
    });
  });

  describe('validateSectionWeights', () => {
    it('should validate correct section weights', () => {
      const weights: SectionWeights = { a: 25, b: 25, c: 25, d: 25 };
      expect(validateSectionWeights(weights)).toBeNull();
    });

    it('should fail if sum is not 100', () => {
      const weights: SectionWeights = { a: 20, b: 20, c: 20, d: 20 };
      expect(validateSectionWeights(weights)).toContain('sum to exactly 100%');
    });

    it('should fail if any weight is less than 1', () => {
      const weights: SectionWeights = { a: 100, b: 0, c: 0, d: 0 };
      expect(validateSectionWeights(weights)).toContain('must be a positive whole number');
    });
  });
});
