// PDF document generation using @react-pdf/renderer.
// Server-side only — renders a CampaignPDF document that includes Buyer Insights,
// 5 ad angles with hooks, 3 ad creatives with images, and the testing plan.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { TestingPlanContent } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#0F172A",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#4F46E5",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottom: "1 solid #E2E8F0",
    color: "#0F172A",
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#334155",
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  listItem: {
    fontSize: 11,
    marginLeft: 12,
    marginBottom: 3,
    lineHeight: 1.5,
  },
  card: {
    border: "1 solid #E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#4F46E5",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 2,
  },
  creativeImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 8,
  },
  angleHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  selectedBadge: {
    fontSize: 8,
    color: "#4F46E5",
    fontWeight: "bold",
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#94A3B8",
    textAlign: "center",
  },
});

interface CampaignPDFProps {
  productName: string;
  buyerProfile: string;
  mainDesire: string;
  painPoints: string[];
  buyingTriggers: string[];
  objections: string[];
  angles: {
    angleLabel: string;
    hook: string;
    score: number;
    isSelected: boolean;
  }[];
  creatives: {
    angleLabel: string;
    headline: string;
    primaryText: string;
    cta: string;
    imageUrl: string | null;
  }[];
  testingPlan: TestingPlanContent | null;
}

const ANGLE_DISPLAY: Record<string, string> = {
  convenience: "Convenience",
  time_saving: "Time Saving",
  pain_point: "Pain Point",
  healthy_lifestyle: "Healthy Lifestyle",
  perfect_gift: "Perfect Gift",
};

export function CampaignPDF({
  productName,
  buyerProfile,
  mainDesire,
  painPoints,
  buyingTriggers,
  objections,
  angles,
  creatives,
  testingPlan,
}: CampaignPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AngleCraft Campaign</Text>
        <Text style={styles.subtitle}>
          Full ad campaign for {productName}
        </Text>

        {/* Buyer Insights */}
        <Text style={styles.sectionTitle}>Buyer Insights</Text>
        <Text style={styles.body}>
          <Text style={styles.label}>Buyer Profile: </Text>
          {buyerProfile}
        </Text>
        <Text style={styles.body}>
          <Text style={styles.label}>Main Desire: </Text>
          {mainDesire}
        </Text>
        <Text style={styles.subSectionTitle}>Pain Points</Text>
        {painPoints.map((p, i) => (
          <Text key={i} style={styles.listItem}>
            {"\u2022"} {p}
          </Text>
        ))}
        <Text style={styles.subSectionTitle}>Buying Triggers</Text>
        {buyingTriggers.map((t, i) => (
          <Text key={i} style={styles.listItem}>
            {"\u2022"} {t}
          </Text>
        ))}
        <Text style={styles.subSectionTitle}>Objections</Text>
        {objections.map((o, i) => (
          <Text key={i} style={styles.listItem}>
            {"\u2022"} {o}
          </Text>
        ))}

        {/* Ad Angles */}
        <Text style={styles.sectionTitle}>Ad Angles &amp; Hooks</Text>
        {angles
          .sort((a, b) => b.score - a.score)
          .map((angle, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.angleHeader}>
                #{i + 1}: {ANGLE_DISPLAY[angle.angleLabel] ?? angle.angleLabel} (Score: {angle.score}/100)
              </Text>
              {angle.isSelected && (
                <Text style={styles.selectedBadge}>SELECTED FOR CAMPAIGN</Text>
              )}
              <Text style={styles.body}>&ldquo;{angle.hook}&rdquo;</Text>
            </View>
          ))}
      </Page>

      {/* Creatives page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Ad Creatives</Text>
        {creatives.map((creative, i) => (
          <View key={i} style={styles.card} wrap={false}>
            <Text style={styles.cardTitle}>
              Creative {i + 1}: {ANGLE_DISPLAY[creative.angleLabel] ?? creative.angleLabel}
            </Text>
            {creative.imageUrl && (
              <Image src={creative.imageUrl} style={styles.creativeImage} />
            )}
            <Text style={styles.label}>Headline</Text>
            <Text style={styles.body}>{creative.headline}</Text>
            <Text style={styles.label}>Primary Text</Text>
            <Text style={styles.body}>{creative.primaryText}</Text>
            <Text style={styles.label}>CTA</Text>
            <Text style={styles.body}>{creative.cta}</Text>
          </View>
        ))}

        {/* Testing Plan */}
        {testingPlan && (
          <>
            <Text style={styles.sectionTitle}>Testing Plan</Text>
            <Text style={styles.subSectionTitle}>Platforms</Text>
            <Text style={styles.body}>
              {testingPlan.platforms.join(", ")}
            </Text>

            <Text style={styles.subSectionTitle}>Budget Allocation</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Meta</Text>
              <Text style={styles.body}>
                Total: {testingPlan.budgetAllocation.meta.totalBudget} |
                Per Angle: {testingPlan.budgetAllocation.meta.perAngleBudget} |
                Duration: {testingPlan.budgetAllocation.meta.duration}
              </Text>
              <Text style={styles.label}>TikTok</Text>
              <Text style={styles.body}>
                Total: {testingPlan.budgetAllocation.tiktok.totalBudget} |
                Per Angle: {testingPlan.budgetAllocation.tiktok.perAngleBudget} |
                Duration: {testingPlan.budgetAllocation.tiktok.duration}
              </Text>
            </View>

            <Text style={styles.subSectionTitle}>Audience Guidance</Text>
            <Text style={styles.body}>Meta: {testingPlan.audienceGuidance.meta}</Text>
            <Text style={styles.body}>TikTok: {testingPlan.audienceGuidance.tiktok}</Text>

            <Text style={styles.subSectionTitle}>
              Testing Duration: {testingPlan.testingDuration.recommendedDays} days
            </Text>
            <Text style={styles.body}>{testingPlan.testingDuration.reasoning}</Text>

            <Text style={styles.subSectionTitle}>Key Metrics</Text>
            {testingPlan.keyMetrics.map((m, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.label}>{m.metric} (Target: {m.target})</Text>
                <Text style={styles.body}>{m.why}</Text>
              </View>
            ))}

            <Text style={styles.subSectionTitle}>Per-Angle Guidance</Text>
            {testingPlan.perAngleGuidance.map((g, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.angleHeader}>
                  {g.angleLabel} — {g.priority}
                </Text>
                <Text style={styles.body}>
                  <Text style={styles.label}>Hypothesis: </Text>
                  {g.hypothesis}
                </Text>
                <Text style={styles.body}>
                  <Text style={styles.label}>Recommendation: </Text>
                  {g.recommendation}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          Generated by AngleCraft
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Generate a PDF buffer from campaign data.
 */
export async function generateCampaignPdf(
  props: CampaignPDFProps
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<CampaignPDF {...props} /> as any);
}
