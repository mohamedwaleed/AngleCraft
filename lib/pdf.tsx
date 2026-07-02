// PDF document generation using @react-pdf/renderer.
// Server-side only — renders a CampaignPDF document that includes testing priorities,
// customer insights, ready-to-test creatives, testing playbook, and supporting sections
// without duplication.

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
  table: {
    border: "1 solid #E2E8F0",
    borderRadius: 8,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottom: "1 solid #E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableCell: {
    fontSize: 10,
    color: "#475569",
    flex: 1,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748B",
    flex: 1,
  },
  tableCellPriority: {
    fontSize: 10,
    color: "#475569",
    width: 60,
    textAlign: "right",
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
    rationale: string;
    score: number;
    isSelected: boolean;
  }[];
  creatives: {
    creativeIndex: number;
    angleLabel: string;
    headline: string;
    primaryText: string;
    cta: string;
    score: number;
    rationale: string;
    imageUrl: string | null;
  }[];
  testingPlan: TestingPlanContent | null;
}

const ANGLE_DISPLAY: Record<string, string> = {
  pain_point: "Pain Point",
  convenience: "Convenience",
  time_saving: "Time Saving",
  gift: "Gift",
  lifestyle: "Lifestyle",
  emotional: "Emotional",
  educational: "Educational",
  social_proof: "Social Proof",
  fear: "Fear",
  aspiration: "Aspirational",
  status: "Status",
  transformation: "Transformation",
};

function SuccessCriteriaPdf({
  criteria,
  targetCpa,
}: {
  criteria: TestingPlanContent["successCriteria"];
  targetCpa: TestingPlanContent["targetCpa"];
}) {
  if (!criteria) return null;
  return (
    <>
      <Text style={styles.label}>Success Signals</Text>
      <Text style={styles.body}>
        <Text style={styles.label}>Purchases: </Text>
        {criteria.purchases.goal}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.label}>Target CPA: </Text>
        {targetCpa
          ? `Recommended maximum ${targetCpa.formatted}`
          : "Below the calculated target CPA."}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.label}>CTR: </Text>
        Good {criteria.ctr.good}, Average {criteria.ctr.average}, Poor {criteria.ctr.poor}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.label}>CPC: </Text>
        Good {criteria.cpc.good}, Average {criteria.cpc.average}, Poor {criteria.cpc.poor}
      </Text>
      <Text style={styles.body}>
        <Text style={styles.label}>Decision: </Text>
        {criteria.decisionRules.condition}. {criteria.decisionRules.action}
      </Text>
    </>
  );
}

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
  const insights = testingPlan?.customerInsights;

  return (
    <Document>
      {/* Page 1 — Strategy & Insights */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AI Creative Strategist — Campaign Launch Plan</Text>
        <Text style={styles.subtitle}>
          Your first Meta Ads testing sprint for {productName}
        </Text>

        {/* Campaign Launch Plan */}
        <Text style={styles.sectionTitle}>Campaign Launch Plan</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{productName}</Text>
          <Text style={styles.body}>
            <Text style={styles.label}>Platform: </Text>Meta Ads
          </Text>
          <Text style={styles.body}>
            <Text style={styles.label}>Primary Placement: </Text>Meta Feed
          </Text>
          <Text style={styles.body}>
            <Text style={styles.label}>Can also be tested on: </Text>Instagram Feed
          </Text>
        </View>

        {/* Customer Insights */}
        <Text style={styles.subSectionTitle}>Customer Insights</Text>
        {insights ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              <Text style={styles.label}>Target Buyer: </Text>
              {insights.targetBuyer}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Main Pain: </Text>
              {insights.mainPain}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Main Desire: </Text>
              {insights.mainDesire}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Main Buying Trigger: </Text>
              {insights.mainBuyingTrigger}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Main Objection: </Text>
              {insights.mainObjection}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Most Important Buyer Emotion: </Text>
              {insights.mostImportantBuyerEmotion}
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.body}>
              <Text style={styles.label}>Buyer Profile: </Text>
              {buyerProfile}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Main Desire: </Text>
              {mainDesire}
            </Text>
          </View>
        )}
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

        {/* Success Metrics */}
        {testingPlan?.successCriteria && (
          <>
            <Text style={styles.subSectionTitle}>Success Metrics</Text>
            <View style={styles.card}>
              <SuccessCriteriaPdf
                criteria={testingPlan.successCriteria}
                targetCpa={testingPlan.targetCpa}
              />
            </View>
          </>
        )}

        {/* What to do next */}
        <Text style={styles.subSectionTitle}>What to do next</Text>
        <View style={styles.card}>
          {[
            "Open Meta Ads Manager.",
            "Create one Sales campaign.",
            "Create one broad ad set.",
            "Upload all three creatives (Creative #1, Creative #2, Creative #3).",
            "Set your daily budget and run for at least 3 days.",
            "Return to this report and compare results.",
          ].map((step, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        {/* Ad Angles */}
        <Text style={styles.sectionTitle}>Ad Angles &amp; Hooks</Text>
        {angles
          .sort((a, b) => b.score - a.score)
          .map((angle, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.angleHeader}>
                #{i + 1}: {ANGLE_DISPLAY[angle.angleLabel] ?? angle.angleLabel} (Score: {angle.score}/10)
              </Text>
              {angle.isSelected && (
                <Text style={styles.selectedBadge}>SELECTED FOR CAMPAIGN</Text>
              )}
              <Text style={styles.body}>&ldquo;{angle.hook}&rdquo;</Text>
              {angle.rationale && (
                <Text style={styles.body}>
                  <Text style={styles.label}>Why: </Text>
                  {angle.rationale}
                </Text>
              )}
            </View>
          ))}

        <Text style={styles.footer}>Generated by AngleCraft</Text>
      </Page>

      {/* Page 2 — Creatives */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Ready To Test Creatives</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>READY TO TEST</Text>
          <Text style={styles.body}>
            These creatives are designed to be uploaded directly to Meta Ads Manager as your first testing sprint.
          </Text>
        </View>

        {creatives.map((creative) => {
          const strategy = testingPlan?.creativeStrategies?.find(
            (s) => s.creativeIndex === creative.creativeIndex
          );
          return (
            <View key={creative.creativeIndex} style={styles.card} wrap={false}>
              <Text style={styles.cardTitle}>
                Creative {creative.creativeIndex}: {ANGLE_DISPLAY[creative.angleLabel] ?? creative.angleLabel}
              </Text>
              {creative.imageUrl && (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={creative.imageUrl} style={styles.creativeImage} />
              )}
              <Text style={styles.label}>Headline</Text>
              <Text style={styles.body}>{creative.headline}</Text>
              <Text style={styles.label}>Primary Text</Text>
              <Text style={styles.body}>{creative.primaryText}</Text>
              <Text style={styles.label}>CTA</Text>
              <Text style={styles.body}>{creative.cta}</Text>
              {strategy && (
                <>
                  <Text style={styles.label}>Angle</Text>
                  <Text style={styles.body}>{strategy.angleCategory}</Text>
                  <Text style={styles.label}>Psychology</Text>
                  <Text style={styles.body}>{strategy.psychology}</Text>
                  <Text style={styles.body}>
                    <Text style={styles.label}>Designed for: </Text>
                    {strategy.primaryPlacement}
                    {strategy.secondaryPlacement && (
                      <Text>
                        {" "}(can also be tested on {strategy.secondaryPlacement})
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.body}>
                    <Text style={styles.label}>Testing Role: </Text>
                    {strategy.testingPriority === 1
                      ? "Primary Test Angle"
                      : strategy.testingPriority === 2
                        ? "Secondary Test Angle"
                        : "Exploration Angle"}
                  </Text>
                  <Text style={styles.body}>
                    <Text style={styles.label}>Best Use Case: </Text>{strategy.bestUseCase}
                  </Text>
                </>
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>Generated by AngleCraft</Text>
      </Page>

      {/* Page 3 — Recommended Testing Setup & How To Execute */}
      {testingPlan && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Recommended Testing Setup</Text>

          <View style={styles.card}>
            <Text style={styles.body}>{testingPlan.recommendedTestingSetup.approach}</Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Campaign Objective: </Text>{testingPlan.recommendedTestingSetup.campaignObjective}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Creatives: </Text>{testingPlan.recommendedTestingSetup.creatives.map((i) => `Creative #${i}`).join(", ")}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Minimum Budget: </Text>{testingPlan.recommendedTestingSetup.budget.minimum}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Recommended Budget: </Text>{testingPlan.recommendedTestingSetup.budget.recommended}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Run Time: </Text>{testingPlan.recommendedTestingSetup.runTime}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Monitor: </Text>{testingPlan.recommendedTestingSetup.monitor.join(", ")}
            </Text>
            <Text style={styles.label}>After testing:</Text>
            {testingPlan.recommendedTestingSetup.afterTesting.map((step, i) => (
              <Text key={i} style={styles.body}>{"\u2022"} {step}</Text>
            ))}
          </View>

          {/* Testing Intensity */}
          <Text style={styles.subSectionTitle}>Testing Intensity</Text>
          <Text style={styles.body}>{testingPlan.testingIntensity.explanation}</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              <Text style={styles.label}>Minimum Validation: </Text>{testingPlan.testingIntensity.minimum}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Recommended Validation: </Text>{testingPlan.testingIntensity.recommended}
            </Text>
            <Text style={styles.body}>
              <Text style={styles.label}>Fast Validation: </Text>{testingPlan.testingIntensity.fast}
            </Text>
          </View>

          {/* How To Execute */}
          {testingPlan.workflow && testingPlan.campaignStrategy && (
            <>
              <Text style={styles.subSectionTitle}>How To Execute</Text>
              <View style={styles.card}>
                <Text style={styles.body}>Day 1: {testingPlan.workflow.day1}</Text>
                <Text style={styles.body}>Day 4: {testingPlan.workflow.day4}</Text>
                <Text style={styles.body}>
                  If one creative outperforms: {testingPlan.workflow.ifPerforms}
                </Text>
                <Text style={styles.body}>
                  If all creatives underperform: {testingPlan.workflow.ifUnderperforms}
                </Text>
                <Text style={styles.body}>
                  If none perform: {testingPlan.workflow.ifNone}
                </Text>
              </View>
            </>
          )}

          {/* Disclaimer */}
          <Text style={styles.subSectionTitle}>Disclaimer</Text>
          <Text style={styles.body}>
            AngleCraft provides strategic creative testing recommendations based on buyer psychology and advertising best practices. Creative roles indicate testing strategy and exploration order, not guaranteed performance predictions.
          </Text>

          <Text style={styles.footer}>Generated by AngleCraft</Text>
        </Page>
      )}
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
